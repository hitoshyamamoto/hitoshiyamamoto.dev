---
repo: soapbar
title: soapbar
summary: "Biblioteca SOAP moderna para Python: cliente e servidor, os 5 bindings, WS-Security e clientes para WITSML, NF-e e VIES."
highlight: true
writeup: construindo-soapbar
tags: ["python", "soap", "witsml", "nfe", "seguranca"]
lang: pt
translationKey: soapbar
---

`soapbar` é uma biblioteca SOAP moderna para Python que cobre **cliente, servidor e
manipulação de WSDL** num único core, com segurança e conformidade como padrão.

## Por quê

SOAP não é uma escolha de arquitetura nova em 2026: é uma obrigação de integração.
Setores como petróleo e gás (WITSML), fisco (NF-e/SEFAZ) e diversos órgãos públicos
ainda expõem serviços SOAP que não vão desaparecer. O problema é que o ferramental
Python para SOAP envelheceu, e três lacunas concretas motivaram o projeto:

- **Os clientes populares são só cliente.** zeep e suds resolvem consumir um WSDL,
  mas não há como expor um servidor SOAP no mesmo ecossistema sem costurar bibliotecas
  diferentes, cada uma com seu modelo mental.
- **Os estilos de legado quebram.** WSDLs antigos usam RPC/encoded, multi-referência e
  arrays SOAP, justamente o que os clientes modernos falam mal ou recusam. Na prática,
  é onde a integração trava.
- **Segurança e endurecimento ficam por sua conta.** WS-Security (assinatura e cifra),
  proteção contra XXE/DoS e TLS mútuo com certificados ICP-Brasil costumam exigir colar
  várias dependências à mão, com risco de fazer errado.

A crença por trás do soapbar: integrar com SOAP, inclusive o legado, deveria ser tão
direto quanto escrever uma função tipada em Python, com segurança e conformidade vindo
de fábrica, não como remendo posterior.

## Como

Cada lacuna é atacada por uma decisão de design específica:

- **Servidor declarativo, com WSDL gerado sozinho.** Uma classe `SoapService` com
  métodos decorados por `@soap_operation` e *type hints* de Python basta: o WSDL 1.1
  sai automaticamente, sem arquivo de configuração. Adaptadores ASGI (FastAPI,
  Starlette, Litestar, Django 3.1+) e WSGI (Flask, Django, Falcon, Pyramid) encaixam o
  serviço no framework que você já usa.
- **Cliente tipado a partir do WSDL.** `SoapClient(wsdl_url=...)` lê o contrato e expõe
  `client.service.<operação>()` com tipos. O transporte cobre timeout, TLS mútuo,
  PKCS#12 (`.pfx`) e chamadas assíncronas via `httpx`.
- **Os cinco estilos de binding, de fato.** document/literal (wrapped e bare),
  rpc/literal, rpc/encoded e document/encoded, sobre SOAP 1.1 e 1.2, com detecção
  automática de versão e tradução de *fault codes* entre as duas. É isso que permite
  conversar com WSDLs legados que os clientes modernos não toleram.
- **Segurança por padrão, não como extra esquecido.** Parser lxml endurecido (entidades
  externas desligadas, sem rede, sem DTD) que neutraliza XXE; limites de 10 MB de corpo
  e 100 níveis de profundidade contra DoS; bloqueio de SSRF em imports remotos de WSDL.
  Sobre essa base, WS-Security completo: UsernameToken (texto e digest), assinatura
  XML-DSIG (inclusive assinatura de elemento por `id`, com RSA-SHA1 e C14N inclusiva
  para a NF-e) e cifra de corpo (AES-256 com chave protegida por RSA-OAEP).
- **Clientes de domínio prontos.** `soapbar.contrib` traz VIES (validação de IVA na UE),
  WITSML 1.4.1.1 STORE (RPC com UsernameToken) e SEFAZ NF-e (document/literal bare,
  SOAP 1.2, TLS mútuo com ICP-Brasil e `<infNFe>` assinado). Eles provam, na prática,
  que o core dá conta de serviços reais e exigentes.
- **Conformidade verificável.** Uma suíte interna de 135 testes, mapeados a SOAP 1.1/1.2,
  WSDL 1.1 e WS-I Basic Profile 1.1, com 46 *checkpoints*. É autoaplicada, não uma
  auditoria independente, e o projeto deixa isso explícito.

```python
from soapbar import SoapService, soap_operation, AsgiSoapApp

class Calculator(SoapService):
    __tns__ = "urn:calc"

    @soap_operation()
    def add(self, a: int, b: int) -> int:
        return a + b

app = AsgiSoapApp(Calculator())   # WSDL em GET ?wsdl; plugue em FastAPI ou Starlette
```

## O quê

No fim, o soapbar é uma **biblioteca SOAP para Python** (3.10 a 3.14, com lxml como
única dependência central) que reúne cliente, servidor e manipulação de WSDL num só
pacote, sob licença Apache-2.0. A instalação é modular: `pip install soapbar` para o
core e o servidor, com os extras `[client]`, `[security]` e `[vies|witsml|nfe]`
conforme a necessidade. O propósito é estreito: ser a peça única para falar SOAP em
Python, do contrato moderno ao WSDL legado, com segurança e conformidade de fábrica.
