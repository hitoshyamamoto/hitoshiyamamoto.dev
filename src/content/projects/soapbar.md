---
repo: soapbar
title: soapbar
summary: "SOAP RPC/encoded para WITSML, NF-e e VIES — onde Zeep e Spyne não resolvem."
highlight: true
writeup: construindo-soapbar
tags: ["python", "soap", "witsml"]
---

Cliente SOAP em Python focado no estilo **RPC/encoded**, comum em servidores
legados como WITSML 1.4.1.1. Trata `multiRef` e `arrayType` explicitamente,
gerando envelopes legíveis e depuráveis.

Use quando os clientes SOAP modernos (Zeep, suds) quebram com o WSDL do
servidor com o qual você precisa integrar.
