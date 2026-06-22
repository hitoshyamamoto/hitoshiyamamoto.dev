import { useState } from 'react';

/**
 * Renderiza o mesmo retorno SOAP nos três estilos de binding, com os tokens de
 * encoding (multiRef, arrayType, xsi:type) realçados. Envelopes sintéticos.
 */

type StyleId = 'rpc-encoded' | 'rpc-literal' | 'doc-literal';
type Lang = 'pt' | 'en';

const XML: Record<StyleId, string> = {
  'rpc-encoded': `<soap:Envelope
    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
    <ns:ListaResponse xmlns:ns="urn:demo">
      <return soapenc:arrayType="ns:Estacao[2]" xsi:type="soapenc:Array">
        <item href="#id1"/>
        <item href="#id2"/>
      </return>
    </ns:ListaResponse>
    <multiRef id="id1" xsi:type="ns:Estacao">
      <codigo xsi:type="xsd:int">12345</codigo>
      <bacia href="#id3"/>
    </multiRef>
    <multiRef id="id2" xsi:type="ns:Estacao">
      <codigo xsi:type="xsd:int">12350</codigo>
      <bacia href="#id3"/>
    </multiRef>
    <multiRef id="id3" xsi:type="ns:Bacia">
      <nome xsi:type="xsd:string">Rio Paraná</nome>
    </multiRef>
  </soap:Body>
</soap:Envelope>`,
  'rpc-literal': `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ns:ListaResponse xmlns:ns="urn:demo">
      <return>
        <Estacao>
          <codigo>12345</codigo>
          <Bacia><nome>Rio Paraná</nome></Bacia>
        </Estacao>
        <Estacao>
          <codigo>12350</codigo>
          <Bacia><nome>Rio Paraná</nome></Bacia>
        </Estacao>
      </return>
    </ns:ListaResponse>
  </soap:Body>
</soap:Envelope>`,
  'doc-literal': `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ListaResponse xmlns="urn:demo">
      <Estacoes>
        <Estacao>
          <codigo>12345</codigo>
          <Bacia><nome>Rio Paraná</nome></Bacia>
        </Estacao>
        <Estacao>
          <codigo>12350</codigo>
          <Bacia><nome>Rio Paraná</nome></Bacia>
        </Estacao>
      </Estacoes>
    </ListaResponse>
  </soap:Body>
</soap:Envelope>`,
};

const STR: Record<Lang, { styles: { id: StyleId; label: string; note: string }[]; group: string; legendPrefix: string }> = {
  pt: {
    group: 'Estilo de binding',
    legendPrefix: 'Em vermelho, os mecanismos do estilo encoded: soapenc:arrayType, xsi:type e as referências multiRef (href/id). ',
    styles: [
      { id: 'rpc-encoded', label: 'RPC/encoded (legado)', note: 'As duas estações compartilham a mesma bacia por referência (href #id3). Tipos viajam no envelope (xsi:type) e o array é declarado em soapenc:arrayType. É onde os clientes modernos tropeçam.' },
      { id: 'rpc-literal', label: 'RPC/literal', note: 'Mantém o invólucro RPC (ListaResponse/return), mas o conteúdo é literal: sem xsi:type, sem multiRef. O schema do WSDL descreve os tipos.' },
      { id: 'doc-literal', label: 'Document/literal wrapped (moderno)', note: 'Tudo inline e validado pelo schema; a bacia é repetida, sem referências. É o que o WSDL moderno gera e o que o zeep espera.' },
    ],
  },
  en: {
    group: 'Binding style',
    legendPrefix: 'In red, the encoded-style machinery: soapenc:arrayType, xsi:type, and the multiRef references (href/id). ',
    styles: [
      { id: 'rpc-encoded', label: 'RPC/encoded (legacy)', note: 'Both stations share the same basin by reference (href #id3). Types travel in the envelope (xsi:type) and the array is declared via soapenc:arrayType. This is where modern clients stumble.' },
      { id: 'rpc-literal', label: 'RPC/literal', note: 'Keeps the RPC wrapper (ListaResponse/return), but the content is literal: no xsi:type, no multiRef. The WSDL schema describes the types.' },
      { id: 'doc-literal', label: 'Document/literal wrapped (modern)', note: 'Everything inline and schema-validated; the basin is repeated, with no references. This is what a modern WSDL emits and what zeep expects.' },
    ],
  },
};

const HL_SPLIT = /(soap:encodingStyle|soapenc:arrayType|xsi:type|multiRef|href|#id\d+|id="id\d+")/g;
const HL_MATCH = /^(soap:encodingStyle|soapenc:arrayType|xsi:type|multiRef|href|#id\d+|id="id\d+")$/;

function highlight(xml: string) {
  return xml.split(HL_SPLIT).map((p, i) =>
    HL_MATCH.test(p) ? (
      <span key={i} className="text-red-400">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export default function EnvelopeComparator({ lang = 'pt' }: { lang?: Lang }) {
  const [style, setStyle] = useState<StyleId>('rpc-encoded');
  const t = STR[lang];
  const current = t.styles.find((s) => s.id === style)!;

  return (
    <div className="not-prose my-6 rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={t.group}>
        {t.styles.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStyle(s.id)}
            aria-pressed={style === s.id}
            className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
              style === s.id ? 'border-accent text-accent' : 'border-border text-muted hover:border-accent/50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <pre className="overflow-x-auto rounded-lg bg-bg p-3 text-xs leading-relaxed">
        <code className="font-mono">{highlight(XML[style])}</code>
      </pre>

      <p className="mt-3 text-xs text-muted">
        {t.legendPrefix}
        {current.note}
      </p>
    </div>
  );
}
