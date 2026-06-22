---
repo: soapbar
title: soapbar
summary: "A modern SOAP library for Python: client and server, the five binding styles, WS-Security, and clients for WITSML, NF-e and VIES."
highlight: true
writeup: building-soapbar
tags: ["python", "soap", "witsml", "nfe", "security"]
lang: en
translationKey: soapbar
---

`soapbar` is a modern SOAP library for Python that covers **client, server and WSDL
handling** in a single core, with security and conformance as defaults.

## Why

SOAP is not a new architectural choice in 2026: it is an integration obligation.
Industries like oil and gas (WITSML), tax authorities (NF-e/SEFAZ) and many government
agencies still expose SOAP services that are not going away. The problem is that
Python's SOAP tooling has aged, and three concrete gaps motivated the project:

- **The popular clients are client-only.** zeep and suds handle consuming a WSDL, but
  there is no way to expose a SOAP server in the same ecosystem without stitching
  together different libraries, each with its own mental model.
- **Legacy styles break.** Old WSDLs use RPC/encoded, multi-reference and SOAP arrays,
  which is exactly what modern clients speak poorly or refuse. In practice, that is
  where the integration stalls.
- **Security and hardening are left to you.** WS-Security (signing and encryption),
  XXE/DoS protection and mutual TLS with ICP-Brasil certificates usually mean gluing
  several dependencies together by hand, with plenty of room to get it wrong.

The belief behind soapbar: integrating with SOAP, legacy included, should be as direct
as writing a typed Python function, with security and conformance shipped by default
rather than bolted on later.

## How

Each gap is met by a specific design decision:

- **A declarative server with auto-generated WSDL.** A `SoapService` class with methods
  decorated by `@soap_operation` and Python type hints is enough: WSDL 1.1 is generated
  automatically, with no configuration files. ASGI adapters (FastAPI, Starlette,
  Litestar, Django 3.1+) and WSGI adapters (Flask, Django, Falcon, Pyramid) plug the
  service into the framework you already use.
- **A typed client from the WSDL.** `SoapClient(wsdl_url=...)` reads the contract and
  exposes `client.service.<operation>()` with types. Transport covers timeouts, mutual
  TLS, PKCS#12 (`.pfx`) and async calls via `httpx`.
- **All five binding styles, for real.** document/literal (wrapped and bare),
  rpc/literal, rpc/encoded and document/encoded, over SOAP 1.1 and 1.2, with automatic
  version detection and fault-code translation between the two. That is what lets it
  talk to legacy WSDLs that modern clients will not tolerate.
- **Security by default, not a forgotten extra.** A hardened lxml parser (external
  entities off, no network, no DTD) that neutralizes XXE; 10 MB body and 100-level
  depth limits against DoS; SSRF blocking on remote WSDL imports. On top of that, full
  WS-Security: UsernameToken (text and digest), XML-DSIG signing (including signing an
  element by `id`, with RSA-SHA1 and inclusive C14N for NF-e) and body encryption
  (AES-256 with a key wrapped by RSA-OAEP).
- **Ready-made domain clients.** `soapbar.contrib` ships VIES (EU VAT validation),
  WITSML 1.4.1.1 STORE (RPC with UsernameToken) and SEFAZ NF-e (document/literal bare,
  SOAP 1.2, mutual TLS with ICP-Brasil and a signed `<infNFe>`). They prove, in
  practice, that the core handles real and demanding services.
- **Verifiable conformance.** An internal suite of 135 tests, mapped to SOAP 1.1/1.2,
  WSDL 1.1 and WS-I Basic Profile 1.1, with 46 checkpoints. It is self-administered,
  not an independent audit, and the project states that explicitly.

```python
from soapbar import SoapService, soap_operation, AsgiSoapApp

class Calculator(SoapService):
    __tns__ = "urn:calc"

    @soap_operation()
    def add(self, a: int, b: int) -> int:
        return a + b

app = AsgiSoapApp(Calculator())   # WSDL at GET ?wsdl; plug into FastAPI or Starlette
```

## What

In the end, soapbar is a **SOAP library for Python** (3.10 to 3.14, with lxml as the
only core dependency) that brings client, server and WSDL handling into one package,
under the Apache-2.0 license. Installation is modular: `pip install soapbar` for the
core and server, with the `[client]`, `[security]` and `[vies|witsml|nfe]` extras as
needed. Its purpose is narrow: be the single piece for speaking SOAP in Python, from
the modern contract to the legacy WSDL, with security and conformance out of the box.
