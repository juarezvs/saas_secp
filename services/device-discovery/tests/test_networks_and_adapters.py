import asyncio

import httpx
import pytest
from pydantic import ValidationError

from discovery.adapters import HikvisionAdapter, HttpProbe, RateBudget, identify_http, probable
from discovery.contracts import Observation
from discovery.local_network import decode_ber
from discovery.networks import authorized_network, target_network
from discovery.scanner import scan


@pytest.mark.parametrize(
    "cidr",
    [
        "0.0.0.0/0",
        "169.254.169.254/32",
        "8.8.8.8/32",
        "127.0.0.1/32",
        "224.0.0.0/24",
        "::1/128",
        "localhost/32",
        "172.19.5.1/24",
    ],
)
def test_reject_invalid_or_external_network(cidr):
    with pytest.raises(ValueError):
        authorized_network(cidr)


def test_allowlist_and_limits():
    assert str(target_network("172.19.5.29", "172.19.5.0/24", 1)) == "172.19.5.29/32"
    with pytest.raises(ValueError):
        target_network("172.20.5.29", "172.19.5.0/24", 256)
    with pytest.raises(ValueError):
        target_network(None, "10.0.0.0/8", 1024)


def test_classification_is_not_invented():
    assert probable("172.19.5.29", "iDFace").confidence == "PROBABLE"
    assert probable("172.19.5.29", "Generic web server").confidence == "UNKNOWN"
    with pytest.raises(ValidationError):
        Observation(ip="172.19.5.29", manufacturer="CONTROL_ID", confidence="CONFIRMED")
    with pytest.raises(ValidationError):
        Observation(ip="172.19.5.29", image="forbidden")


async def test_xml_external_entities_are_refused_without_losing_the_host():
    def transport(request):
        if request.url.path == "/":
            return httpx.Response(200, text="<title>Hikvision TEST ONLY</title>")
        return httpx.Response(
            200,
            content=b'<!DOCTYPE DeviceInfo [<!ENTITY x SYSTEM "file:///etc/passwd">]><DeviceInfo><model>&x;</model><serialNumber>TEST</serialNumber></DeviceInfo>',
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(transport)) as client:
        result = await identify_http("172.19.5.29", [80], client, RateBudget(1000), 0.2)
    assert result.confidence == "PROBABLE" and result.serial is None and result.warnings
    assert "root:" not in result.model_dump_json()


async def test_control_id_only_reads_metadata_and_secrets_are_not_results():
    paths = []

    def transport(request):
        paths.append(request.url.path)
        if request.url.path == "/":
            return httpx.Response(200, text="<title>iDFace</title>")
        if request.url.path == "/login.fcgi":
            return httpx.Response(200, json={"session": "SENSITIVE_SESSION"})
        if request.url.path == "/system_information.fcgi":
            return httpx.Response(
                200,
                json={
                    "serial": "TEST-ONLY-001",
                    "version": "1.2.3",
                    "network": {"mac": "00:11:22:33:44:55"},
                    "iDCloud_code": "DO_NOT_STORE",
                },
            )
        raise AssertionError(request.url.path)

    async with httpx.AsyncClient(transport=httpx.MockTransport(transport)) as client:
        result = await identify_http(
            "172.19.5.29",
            [80],
            client,
            RateBudget(100000),
            1,
            {"172.19.5.29": {"protocol": "CONTROL_ID_FACE_ID", "username": "TEST", "password": "TEST_SECRET"}},
        )
    assert result.confidence == "CONFIRMED"
    assert result.serial == "TEST-ONLY-001"
    assert result.device_type == "FACIAL_TERMINAL"
    assert paths == ["/", "/login.fcgi", "/system_information.fcgi"]
    assert not any(
        secret in result.model_dump_json() for secret in ["TEST_SECRET", "SENSITIVE_SESSION", "DO_NOT_STORE"]
    )


async def test_no_password_guessing_and_redirects_not_followed():
    paths = []

    def transport(request):
        paths.append(request.url.path)
        return httpx.Response(
            302, headers={"location": "http://169.254.169.254/latest/meta-data"}, text="<title>iDFace</title>"
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(transport)) as client:
        result = await identify_http("172.19.5.29", [80], client, RateBudget(100000), 1)
    assert paths == ["/"]
    assert result.confidence == "PROBABLE"
    assert result.serial is None


async def test_timeouts_and_invalid_data_do_not_confirm():
    async def transport(request):
        raise httpx.ReadTimeout("TEST", request=request)

    async with httpx.AsyncClient(transport=httpx.MockTransport(transport)) as client:
        result = await identify_http("172.19.5.29", [80], client, RateBudget(100000), 1)
    assert result.confidence == "UNKNOWN"


async def test_hikvision_structured_metadata():
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(
            lambda _: httpx.Response(
                200,
                text='<DeviceInfo xmlns="http://www.hikvision.com/ver20/XMLSchema"><model>DS-K1T-TEST</model><serialNumber>TEST-ONLY-HIK</serialNumber></DeviceInfo>',
            )
        )
    ) as client:
        from discovery.adapters import Candidate

        result = await HikvisionAdapter().identify(
            Candidate("172.19.5.20", 80, "Hikvision", {}), HttpProbe(client, "172.19.5.20", 80, RateBudget(10000), 1)
        )
    assert result.confidence == "CONFIRMED"
    assert result.driver is None


async def test_agent_refuses_network_before_probing(monkeypatch):
    async def forbidden(*args):
        raise AssertionError("No connection allowed")

    monkeypatch.setattr("discovery.scanner.open_tcp", forbidden)
    job = {"target": "172.20.1.1/32", "targets": ["172.20.1.1"], "config": {"cidr": "172.20.1.0/24", "max_hosts": 256}}
    with pytest.raises(ValueError, match="LOCAL_ALLOWLIST"):
        async for _ in scan(job, {"networks": ["172.19.5.0/24"]}, asyncio.Event()):
            pass


def test_snmp_parser_rejects_truncation_and_unbounded_lengths():
    for raw in [b"\x30\x82\xff\xff", b"\x30", b"\x30\x80"]:
        with pytest.raises(ValueError):
            decode_ber(raw)
