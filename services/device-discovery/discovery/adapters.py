import asyncio
import http.client
import json
import re
import ssl
from abc import ABC, abstractmethod
from dataclasses import dataclass
from ipaddress import IPv4Address
from urllib.parse import urlencode

import httpx
from defusedxml import ElementTree
from defusedxml.common import DefusedXmlException

from .contracts import Evidence, Observation

HTTP_PORTS = {80, 443, 8080, 8443}
MAX_RESPONSE = 65536


class RateBudget:
    def __init__(self, rate):
        self.delay = 1 / rate
        self.lock = asyncio.Lock()
        self.last = 0.0

    async def wait(self):
        async with self.lock:
            loop = asyncio.get_running_loop()
            await asyncio.sleep(max(0, self.last + self.delay - loop.time()))
            self.last = loop.time()


class HttpProbe:
    def __init__(self, client, ip, port, budget, timeout, *, legacy=False, verify=True):
        self.client, self.ip, self.port = client, str(IPv4Address(ip)), port
        self.budget, self.timeout, self.legacy, self.verify = budget, timeout, legacy, verify
        self.scheme = "https" if port in {443, 8443} else "http"

    async def request(self, method, path, *, payload=None, auth=None):
        if not path.startswith("/") or path.startswith("//"):
            raise ValueError("Caminho de protocolo inválido")
        await self.budget.wait()
        async with asyncio.timeout(self.timeout):
            return await self._request(method, path, payload=payload, auth=auth)

    async def _request(self, method, path, *, payload, auth):
        if self.legacy and not auth:
            return await asyncio.to_thread(self._legacy, method, path, payload)
        async with self.client.stream(
            method,
            f"{self.scheme}://{self.ip}:{self.port}{path}",
            json=payload,
            auth=auth,
            timeout=self.timeout,
            follow_redirects=False,
        ) as response:
            content = bytearray()
            async for chunk in response.aiter_bytes():
                content.extend(chunk)
                if len(content) > MAX_RESPONSE:
                    raise ValueError("METADATA_RESPONSE_TOO_LARGE")
            return httpx.Response(response.status_code, content=bytes(content), headers=response.headers)

    def _legacy(self, method, path, payload):
        context = ssl.create_default_context()
        if not self.verify:
            context.check_hostname, context.verify_mode = False, ssl.CERT_NONE
        connection = (
            http.client.HTTPSConnection(self.ip, self.port, timeout=self.timeout, context=context)
            if self.scheme == "https"
            else http.client.HTTPConnection(self.ip, self.port, timeout=self.timeout)
        )
        try:
            body = json.dumps(payload).encode() if payload is not None else None
            connection.request(method, path, body=body, headers={"Content-Type": "application/json"})
            response = connection.getresponse()
            data = response.read(MAX_RESPONSE + 1)
            if len(data) > MAX_RESPONSE:
                raise ValueError("METADATA_RESPONSE_TOO_LARGE")
            return httpx.Response(response.status, content=data, headers=dict(response.getheaders()))
        finally:
            connection.close()


@dataclass
class Candidate:
    ip: str
    port: int
    title: str
    headers: dict
    credential: dict | None = None


def text(value):
    return str(value).strip()[:120] if isinstance(value, (str, int, float)) and str(value).strip() else None


def declared(method, field, value):
    return Evidence(method=method, field=field, value=str(value)[:250], source="DECLARED")


class DeviceDiscoveryAdapter(ABC):
    @abstractmethod
    def probe(self, target: Candidate) -> bool: ...

    @abstractmethod
    async def identify(self, target: Candidate, http: HttpProbe) -> Observation | None: ...

    def get_capabilities(self, result: Observation):
        return result.capabilities

    async def test_connection(self, target: Candidate, http: HttpProbe):
        # Teste de metadados, separado de qualquer operação de escrita/coleta.
        result = await self.identify(target, http)
        return {"ok": result is not None, "capabilities": result.capabilities if result else []}


class ControlIdAdapter(DeviceDiscoveryAdapter):
    def probe(self, target):
        return bool(re.search(r"control\s*id|idface|iduhf|idaccess|idclass|idblock", target.title, re.I)) or (
            target.credential or {}
        ).get("protocol", "").startswith("CONTROL_ID")

    async def identify(self, target, http):
        credential = target.credential
        if not credential or not credential.get("username") or not credential.get("password"):
            return None
        response = await http.request(
            "POST", "/login.fcgi", payload={"login": credential["username"], "password": credential["password"]}
        )
        if response.status_code != 200:
            return None
        session = response.json().get("session")
        if not isinstance(session, str) or len(session) > 200:
            return None
        query = urlencode({"session": session})
        protocol = credential.get("protocol", "CONTROL_ID_FACE_ID")
        endpoint = "get_about.fcgi" if protocol == "CONTROL_ID_IDCLASS_BIO" else "system_information.fcgi"
        response = await http.request("POST", f"/{endpoint}?{query}", payload={})
        if response.status_code != 200:
            return None
        info = response.json()
        serial = text(info.get("nSerie") if protocol == "CONTROL_ID_IDCLASS_BIO" else info.get("serial"))
        if not serial:
            return None
        network = info.get("network") if isinstance(info.get("network"), dict) else {}
        model_match = re.search(
            r"\b(iDFace(?:\s+Max)?|iDUHF|iDAccess(?:\s+Nano)?|iDBlock|iDClass)\b", target.title, re.I
        )
        model = model_match.group(0) if model_match else None
        face = info.get("isFacial") is True or (model and "idface" in model.lower())
        result = Observation(
            ip=target.ip,
            manufacturer="CONTROL_ID",
            model=model,
            serial=serial,
            firmware=text(info.get("versionFW", info.get("version"))),
            mac=text(info.get("mac", network.get("mac"))),
            device_type="FACIAL_TERMINAL"
            if face
            else "BIOMETRIC_CLOCK"
            if protocol == "CONTROL_ID_IDCLASS_BIO"
            else "ACCESS_CONTROLLER",
            confidence="CONFIRMED",
            protocols=[protocol],
            driver=protocol,
            capabilities=["METADATA_READ", "AUTHENTICATED_METADATA"],
            evidence=[
                declared("CONTROL_ID_API", "serial", serial),
                Evidence(method="CONTROL_ID_API", field="manufacturer", value="CONTROL_ID", source="INFERRED"),
            ],
        )
        if model:
            result.evidence.append(Evidence(method="HTTP_TITLE", field="model", value=model, source="INFERRED"))
        if result.mac:
            result.evidence.append(declared("CONTROL_ID_API", "mac", result.mac))
        if result.firmware:
            result.evidence.append(declared("CONTROL_ID_API", "firmware", result.firmware))
        return result


class HikvisionAdapter(DeviceDiscoveryAdapter):
    def probe(self, target):
        return (
            "hikvision" in (target.title + str(target.headers)).lower()
            or (target.credential or {}).get("protocol") == "HIKVISION_ISAPI"
        )

    async def identify(self, target, http):
        credential = target.credential or {}
        auth = (
            httpx.DigestAuth(credential["username"], credential["password"])
            if credential.get("username") and credential.get("password")
            else None
        )
        response = await http.request("GET", "/ISAPI/System/deviceInfo", auth=auth)
        if response.status_code != 200:
            return None
        root = ElementTree.fromstring(response.content)
        if root.tag.split("}")[-1] != "DeviceInfo":
            return None
        fields = {e.tag.split("}")[-1]: (e.text or "").strip() for e in root}
        if not fields.get("serialNumber") or not fields.get("model"):
            return None
        kind = "ACCESS_CONTROLLER" if fields["model"].upper().startswith("DS-K") else "UNKNOWN"
        return Observation(
            ip=target.ip,
            manufacturer="HIKVISION",
            model=fields["model"],
            serial=fields["serialNumber"],
            firmware=text(fields.get("firmwareVersion")),
            mac=text(fields.get("macAddress")),
            hostname=text(fields.get("deviceName")),
            device_type=kind,
            confidence="CONFIRMED",
            protocols=["HIKVISION_ISAPI"],
            capabilities=["METADATA_READ"],
            warnings=["Driver de coleta Hikvision não está implementado no SECP"],
            evidence=[
                declared("HIKVISION_ISAPI", key, fields[value])
                for key, value in [("serial", "serialNumber"), ("model", "model")]
            ],
        )


class IntelbrasAdapter(DeviceDiscoveryAdapter):
    def probe(self, target):
        return (
            any(x in target.title.lower() for x in ["intelbras", "dahua", "bio-t"])
            or (target.credential or {}).get("protocol") == "INTELBRAS_BIO_T"
        )

    async def identify(self, target, http):
        credential = target.credential or {}
        if (
            credential.get("protocol") != "INTELBRAS_BIO_T"
            or not credential.get("username")
            or not credential.get("password")
        ):
            return None
        auth = httpx.DigestAuth(credential["username"], credential["password"])
        response = await http.request("GET", "/cgi-bin/magicBox.cgi?action=getSerialNo", auth=auth)
        if response.status_code != 200:
            return None
        fields = dict(re.findall(r"(?m)^([\w.]+)=([^\r\n]+)", response.text))
        serial = text(fields.get("sn", fields.get("serialNumber")))
        if not serial:
            return None
        return Observation(
            ip=target.ip,
            manufacturer="INTELBRAS",
            serial=serial,
            confidence="CONFIRMED",
            protocols=["INTELBRAS_BIO_T"],
            driver="INTELBRAS_BIO_T",
            capabilities=["METADATA_READ"],
            evidence=[declared("INTELBRAS_API", "serial", serial)],
            warnings=["Fabricante associado ao perfil Intelbras explicitamente configurado pelo administrador"],
        )


ADAPTERS: tuple[DeviceDiscoveryAdapter, ...] = (ControlIdAdapter(), HikvisionAdapter(), IntelbrasAdapter())


def probable(ip, title, protocols=None):
    patterns = [
        (r"control\s*id|idface|iduhf|idaccess|idclass", "CONTROL_ID"),
        (r"henry", "HENRY"),
        (r"intelbras", "INTELBRAS"),
        (r"hikvision", "HIKVISION"),
        (r"zkteco|zksoftware", "ZKTECO"),
        (r"dimep", "DIMEP"),
    ]
    manufacturer = next((brand for pattern, brand in patterns if re.search(pattern, title, re.I)), None)
    return Observation(
        ip=ip,
        manufacturer=manufacturer,
        confidence="PROBABLE" if manufacturer else "UNKNOWN",
        protocols=protocols or [],
        evidence=[Evidence(method="HTTP_TITLE", field="manufacturer", value=manufacturer, source="INFERRED")]
        if manufacturer
        else [],
        warnings=["ZKTeco: SDK/protocolo do modelo ainda não validado"] if manufacturer == "ZKTECO" else [],
    )


async def identify_http(ip, open_ports, client, budget, timeout, credentials=None, verify=True):
    result = Observation(ip=ip, open_ports=open_ports)
    for port in open_ports:
        credential = (credentials or {}).get(ip)
        if port not in HTTP_PORTS and not (credential and credential.get("port", 80) == port):
            continue
        http = HttpProbe(
            client, ip, port, budget, max(timeout, 2), legacy=bool((credential or {}).get("legacy_http")), verify=verify
        )
        try:
            response = await http.request("GET", "/")
            title_match = re.search(r"<title[^>]*>([^<]{0,250})</title>", response.text, re.I)
            title = title_match.group(1).strip() if title_match else ""
            headers = {key: response.headers.get(key, "")[:150] for key in ["server", "www-authenticate"]}
            candidate = Candidate(ip, port, title, headers, credential)
            hint = probable(ip, title, ["HTTPS" if port in {443, 8443} else "HTTP"])
            if hint.confidence == "PROBABLE" or result.confidence == "UNKNOWN":
                hint.open_ports = open_ports
                result = hint
            for adapter in ADAPTERS:
                if adapter.probe(candidate):
                    identified = await adapter.identify(candidate, http)
                    if identified:
                        identified.open_ports = open_ports
                        return identified
        except (
            httpx.HTTPError,
            ValueError,
            OSError,
            TimeoutError,
            ElementTree.ParseError,
            DefusedXmlException,
            KeyError,
            TypeError,
        ):
            if len(result.warnings) < 16:
                result.warnings.append("Metadados indisponíveis nesta porta; não houve alteração no dispositivo")
    return result
