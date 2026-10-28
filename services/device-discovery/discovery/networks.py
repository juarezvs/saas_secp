from ipaddress import IPv4Address, IPv4Network

PRIVATE = [IPv4Network(c) for c in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")]


def authorized_network(cidr: str, *, allow_loopback=False) -> IPv4Network:
    network = IPv4Network(cidr, strict=True)
    permitted = PRIVATE + ([IPv4Network("127.0.0.0/8")] if allow_loopback else [])
    if not any(network.subnet_of(parent) for parent in permitted):
        raise ValueError("Apenas redes privadas explicitamente autorizadas são permitidas")
    return network


def target_network(target: str | None, allowed: str, maximum: int, *, allow_loopback=False) -> IPv4Network:
    parent = authorized_network(allowed, allow_loopback=allow_loopback)
    network = IPv4Network(target if target and "/" in target else f"{target}/32" if target else allowed, strict=True)
    if not network.subnet_of(parent):
        raise ValueError("Destino fora da rede autorizada")
    if sum(1 for _ in bounded_hosts(network, maximum)) > maximum:
        raise ValueError("Quantidade de hosts excede o limite")
    return network


def bounded_hosts(network: IPv4Network, maximum: int):
    # Antes de materializar uma rede grande, verificar o limite numérico.
    count = network.num_addresses if network.prefixlen >= 31 else network.num_addresses - 2
    if count > maximum:
        raise ValueError("Quantidade de hosts excede o limite")
    yield from network.hosts()


def require_ip_in_network(ip: str, cidr: str):
    address = IPv4Address(ip)
    if address not in IPv4Network(cidr):
        raise ValueError("IP fora da autorização")
    return str(address)
