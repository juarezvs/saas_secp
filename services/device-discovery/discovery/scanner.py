import asyncio
import time

import httpx

from .adapters import RateBudget, identify_http, probable
from .contracts import METHODS, PORTS, Evidence, TargetResult
from .local_network import arp_neighbors, icmp, multicast_probe, snmp_description
from .networks import authorized_network, require_ip_in_network, target_network


async def open_tcp(ip, port, timeout, budget):
    await budget.wait()
    try:
        _reader, writer = await asyncio.wait_for(asyncio.open_connection(ip, port), timeout)
        writer.close()
        try:
            await writer.wait_closed()
        except OSError:
            pass
        return True
    except (TimeoutError, OSError):
        return False


async def scan(job, local_config, cancel: asyncio.Event):
    config = job["config"]
    for policy in (config, local_config):
        start, end = policy.get("window_start_utc"), policy.get("window_end_utc")
        hour = time.gmtime().tm_hour
        if (
            start is not None
            and end is not None
            and not (start <= hour < end if start < end else hour >= start or hour < end)
        ):
            raise ValueError("OUTSIDE_AUTHORIZED_TIME_WINDOW")
    allowed = local_config["networks"]
    allow_loopback = local_config.get("allow_loopback", False)
    actual = target_network(
        job["target"],
        config["cidr"],
        min(config["max_hosts"], local_config.get("max_hosts", 1024)),
        allow_loopback=allow_loopback,
    )
    if not any(actual.subnet_of(authorized_network(n, allow_loopback=allow_loopback)) for n in allowed):
        raise ValueError("JOB_OUTSIDE_LOCAL_ALLOWLIST")
    if (
        not isinstance(job["targets"], list)
        or len(job["targets"]) > min(config["max_hosts"], local_config.get("max_hosts", 1024), 1024)
        or len(set(job["targets"])) != len(job["targets"])
    ):
        raise ValueError("INVALID_TARGET_COUNT")
    if not set(config["methods"]) <= METHODS or not set(config["ports"]) <= PORTS:
        raise ValueError("UNSUPPORTED_DISCOVERY_METHOD_OR_PORT")
    for policy in (config, local_config):
        for field, lower, upper in (
            ("rate", 1, 20),
            ("concurrency", 1, 24),
            ("timeout", 0.2, 5),
            ("max_hosts", 1, 1024),
        ):
            if field in policy and not lower <= policy[field] <= upper:
                raise ValueError("INVALID_LOCAL_LIMIT")
    methods = set(config["methods"]) & set(local_config.get("methods", ["tcp", "arp"]))
    ports = sorted(set(config["ports"]) & set(local_config.get("ports", [80, 443, 3000, 3001, 8080, 8443])))
    if not methods:
        raise ValueError("NO_AUTHORIZED_METHOD")
    if "tcp" not in methods:
        ports = []
    for ip in job["targets"]:
        require_ip_in_network(ip, str(actual))
    budget = RateBudget(min(config["rate"], local_config.get("rate", 10), 20))
    concurrency = min(config["concurrency"], local_config.get("concurrency", 8), 24)
    semaphore = asyncio.Semaphore(concurrency)
    passive = await asyncio.to_thread(arp_neighbors) if "arp" in methods else {}
    multicast = {}
    for method in sorted(methods & {"mdns", "ssdp", "ws-discovery"}):
        if cancel.is_set():
            return
        try:
            multicast.update(
                await asyncio.to_thread(multicast_probe, method, str(actual), local_config.get("bind_ip", "0.0.0.0"))
            )
        except (OSError, ValueError):
            pass
    timeout = min(config["timeout"], local_config.get("timeout", 2), 5)
    verify = local_config.get("device_verify_tls", True)
    queue = asyncio.Queue()
    for ip in job["targets"]:
        queue.put_nowait(ip)
    output = asyncio.Queue()

    async with httpx.AsyncClient(
        verify=verify,
        trust_env=False,
        follow_redirects=False,
        limits=httpx.Limits(max_connections=24, max_keepalive_connections=0),
    ) as client:

        async def worker():
            while not cancel.is_set():
                try:
                    ip = queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
                async with semaphore:
                    try:
                        opened = []
                        for port in ports:
                            if cancel.is_set():
                                break
                            if await open_tcp(ip, port, timeout, budget):
                                opened.append(port)
                        if cancel.is_set():
                            break
                        reached = bool(opened or ip in passive or ip in multicast)
                        if "icmp" in methods and not reached:
                            await budget.wait()
                            reached = await icmp(ip, timeout)
                        description = None
                        if "snmp" in methods and local_config.get("snmp_community"):
                            try:
                                await budget.wait()
                                description = await asyncio.to_thread(
                                    snmp_description, ip, local_config["snmp_community"], timeout
                                )
                                reached = reached or bool(description)
                            except (OSError, ValueError, IndexError, TypeError):
                                pass
                        observation = None
                        if reached:
                            observation = await identify_http(
                                ip, opened, client, budget, timeout, local_config.get("credentials", {}), verify
                            )
                            observation.mac = observation.mac or passive.get(ip)
                            if ip in multicast:
                                observation.protocols.append(multicast[ip])
                            if description and observation.confidence == "UNKNOWN":
                                hint = probable(ip, description)
                                observation.manufacturer, observation.confidence = hint.manufacturer, hint.confidence
                                observation.evidence.extend(hint.evidence)
                                observation.evidence.append(
                                    Evidence(
                                        method="SNMP_READ_ONLY",
                                        field="description",
                                        value=description,
                                        source="DECLARED",
                                    )
                                )
                        await output.put(TargetResult(ip=ip, observation=observation))
                    except Exception:
                        # Não transportar respostas HTTP, credenciais ou stack traces nos resultados.
                        await output.put(TargetResult(ip=ip, error="PROBE_FAILED"))
                    finally:
                        queue.task_done()

        workers = [asyncio.create_task(worker()) for _ in range(min(concurrency, len(job["targets"])))]
        try:
            while any(not worker.done() for worker in workers) or not output.empty():
                try:
                    yield await asyncio.wait_for(output.get(), 0.2)
                except TimeoutError:
                    continue
            await asyncio.gather(*workers)
        finally:
            for task in workers:
                task.cancel()
            await asyncio.gather(*workers, return_exceptions=True)
