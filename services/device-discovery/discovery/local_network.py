import asyncio
import os
import re
import socket
import subprocess
from ipaddress import IPv4Address, IPv4Network
from pathlib import Path
from uuid import uuid4

import psutil
from dnslib import DNSError, DNSRecord


def interfaces():
    return [
        {"name": name[:80], "ip": item.address, "netmask": item.netmask or ""}
        for name, addresses in psutil.net_if_addrs().items()
        for item in addresses
        if item.family == socket.AF_INET
    ][:32]


def arp_neighbors():
    result = {}
    path = Path("/proc/net/arp")
    if path.exists():
        for line in path.read_text().splitlines()[1:]:
            values = line.split()
            if len(values) >= 4 and values[2] != "0x0" and values[3] != "00:00:00:00:00:00":
                result[values[0]] = values[3].upper()
    elif os.name == "nt":
        try:
            output = subprocess.run(
                ["arp", "-a"], capture_output=True, timeout=3, creationflags=subprocess.CREATE_NO_WINDOW
            ).stdout.decode(errors="replace")
            for ip, mac in re.findall(r"(\d+\.\d+\.\d+\.\d+)\s+([\da-fA-F-]{17})", output):
                result[ip] = mac.replace("-", ":").upper()
        except (OSError, subprocess.TimeoutExpired):
            pass
    return result


async def icmp(ip, timeout):
    str(IPv4Address(ip))
    args = (
        ["ping", "-n", "1", "-w", str(int(timeout * 1000)), ip]
        if os.name == "nt"
        else ["ping", "-c", "1", "-W", str(max(1, int(timeout))), ip]
    )
    try:
        process = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
            **({"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}),
        )
        try:
            return await asyncio.wait_for(process.wait(), timeout + 1) == 0
        except TimeoutError:
            process.kill()
            await process.wait()
            return False
    except OSError:
        return False


def multicast_probe(method, cidr, bind_ip="0.0.0.0", timeout=2):
    network = IPv4Network(cidr)
    local_ips = {item["ip"] for item in interfaces() if IPv4Address(item["ip"]) in network}
    if bind_ip == "0.0.0.0":
        bind_ip = next(iter(sorted(local_ips)), None)
    if not bind_ip or bind_ip not in local_ips:
        raise ValueError("Multicast exige interface local contida na rede autorizada")
    if method == "mdns":
        address, port = "224.0.0.251", 5353
        payload = DNSRecord.question("_services._dns-sd._udp.local", "PTR").pack()
    elif method == "ssdp":
        address, port = "239.255.255.250", 1900
        payload = b'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 1\r\nST: ssdp:all\r\n\r\n'
    elif method == "ws-discovery":
        address, port = "239.255.255.250", 3702
        payload = (
            f'<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"><s:Header><a:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action><a:MessageID>urn:uuid:{uuid4()}</a:MessageID><a:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To></s:Header><s:Body><d:Probe/></s:Body></s:Envelope>'
        ).encode()
    else:
        raise ValueError("Método multicast desconhecido")
    result = {}
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as connection:
        connection.settimeout(timeout)
        connection.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 1)
        connection.bind((bind_ip, 0))
        if bind_ip != "0.0.0.0":
            connection.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF, socket.inet_aton(bind_ip))
        connection.sendto(payload, (address, port))
        for _ in range(64):
            try:
                data, (ip, _) = connection.recvfrom(8192)
                if IPv4Address(ip) not in network:
                    continue
                # Não seguir LOCATION/XAddrs: poderiam apontar para outro host/serviço.
                if method == "mdns":
                    DNSRecord.parse(data)
                result[ip] = method
            except TimeoutError:
                break
            except (ValueError, OSError, DNSError):
                continue
    return result


def ber(tag, value):
    length = len(value)
    encoded = bytes([length]) if length < 128 else b"\x82" + length.to_bytes(2, "big")
    return bytes([tag]) + encoded + value


def decode_ber(data, depth=0):
    if depth > 8 or len(data) > 8192:
        raise ValueError("SNMP inválido")
    values, offset = [], 0
    while offset < len(data):
        if offset + 2 > len(data):
            raise ValueError("SNMP truncado")
        tag, length = data[offset], data[offset + 1]
        offset += 2
        if length & 128:
            size = length & 127
            if not 1 <= size <= 2 or offset + size > len(data):
                raise ValueError("Tamanho SNMP inválido")
            length = int.from_bytes(data[offset : offset + size], "big")
            offset += size
        value = data[offset : offset + length]
        if len(value) != length:
            raise ValueError("SNMP truncado")
        offset += length
        values.append((tag, decode_ber(value, depth + 1) if tag & 32 else value))
    return values


def snmp_description(ip, community, timeout):
    # RFC 3416: GET somente de sysDescr.0; não há SET nem walk.
    str(IPv4Address(ip))
    if not community or len(community) > 128:
        return None
    request_id = bytes([os.urandom(1)[0] & 0x7F]) + os.urandom(2)
    binding = ber(0x30, ber(6, bytes([43, 6, 1, 2, 1, 1, 1, 0])) + ber(5, b""))
    pdu = ber(0xA0, ber(2, request_id) + ber(2, b"\0") + ber(2, b"\0") + ber(0x30, binding))
    payload = ber(0x30, ber(2, b"\1") + ber(4, community.encode()) + pdu)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as connection:
        connection.settimeout(timeout)
        connection.sendto(payload, (ip, 161))
        data, (source, _) = connection.recvfrom(8192)
    if source != ip:
        return None
    root = decode_ber(data)[0][1]
    if root[0] != (2, b"\1") or root[1] != (4, community.encode()) or root[2][0] != 0xA2:
        return None
    response = root[2][1]
    if response[0][1] != request_id or int.from_bytes(response[1][1], "big") != 0:
        return None
    fields = response[3][1][0][1]
    if fields[0] != (6, bytes([43, 6, 1, 2, 1, 1, 1, 0])):
        return None
    return fields[1][1].decode(errors="replace")[:250] if fields[1][0] == 4 else None
