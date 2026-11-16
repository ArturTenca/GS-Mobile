// Textos padrao (pt-BR) por regra de PII: usados quando a IA nao esta disponivel.
// ATENCAO: o bloco TEMPLATES e duplicado de proposito em
// supabase/functions/explain-risk/logic.ts (a funcao nao pode importar de src/).
// O teste de paridade em logic.test.ts garante que os dois sao identicos: edite os dois juntos.
// Os textos evitam palavras que o proprio motor de PII sinaliza (sem exemplos de dados).

export type RuleLevel = 'baixo' | 'moderado' | 'alto' | 'critico';
export type TemplateText = { titulo: string; risco_real: string; o_que_fazer: string };
export type TemplateItem = { rule_id: string; severity: string };
export type TemplateResult = TemplateText & { rule_id: string; nivel: RuleLevel; source: 'template' };

export const RULE_LEVEL: Record<string, RuleLevel> = {
  low: 'baixo',
  medium: 'moderado',
  high: 'alto',
  critical: 'critico',
};

// TEMPLATES-BEGIN
export const TEMPLATES: Record<string, TemplateText> = {
  cpf: {
    titulo: 'Documento pessoal exposto',
    risco_real: 'Um documento pessoal completo pode ser usado por golpistas para abrir contas ou pedir credito em seu nome.',
    o_que_fazer: 'Remova esse documento do texto e compartilhe so quando for realmente necessario, em canais seguros.',
  },
  cpf_masked: {
    titulo: 'Documento pessoal parcialmente visivel',
    risco_real: 'Mesmo mascarado, o documento pode ser juntado a outros dados para identificar voce.',
    o_que_fazer: 'Evite escrever documentos pessoais, mesmo parciais, em campos livres do aplicativo.',
  },
  cnpj: {
    titulo: 'Registro da empresa exposto',
    risco_real: 'O registro da empresa permite ligar o nome do negocio a dados publicos e facilita fraudes de identidade.',
    o_que_fazer: 'Nao digite o registro da empresa em campos de texto livre. Use apenas onde ele for exigido.',
  },
  rg: {
    titulo: 'Documento de identidade exposto',
    risco_real: 'O documento de identidade pode ser copiado e usado para falsificar cadastros.',
    o_que_fazer: 'Retire o numero do campo e guarde o documento fora do aplicativo.',
  },
  email: {
    titulo: 'Endereco de contato digital exposto',
    risco_real: 'Esse endereco pode receber mensagens falsas e tentativas de golpe.',
    o_que_fazer: 'Nao coloque contatos pessoais em nomes ou descricoes. Use apenas os campos de conta.',
  },
  br_phone: {
    titulo: 'Telefone exposto',
    risco_real: 'Um telefone visivel pode receber ligacoes e mensagens de golpistas.',
    o_que_fazer: 'Tire o telefone do texto e informe-o somente nos campos de contato previstos.',
  },
  cep: {
    titulo: 'Codigo postal exposto',
    risco_real: 'Junto com outros dados, o codigo postal ajuda a localizar sua propriedade.',
    o_que_fazer: 'Informe o codigo postal apenas no campo de endereco e evite repetir em outros textos.',
  },
  card: {
    titulo: 'Dado de cartao exposto',
    risco_real: 'Dados de cartao em texto aberto podem gerar compras indevidas e prejuizo financeiro.',
    o_que_fazer: 'Apague o dado agora. Se ele foi compartilhado, avise seu banco e peca um novo cartao.',
  },
  jwt: {
    titulo: 'Chave de sessao exposta',
    risco_real: 'Quem tiver essa chave pode agir como se fosse voce dentro do sistema.',
    o_que_fazer: 'Saia da conta e entre de novo para invalidar a sessao. Nunca cole chaves em campos de texto.',
  },
  anthropic_key: {
    titulo: 'Chave de servico de IA exposta',
    risco_real: 'Quem obtiver essa chave pode usar o servico por sua conta e gerar custos.',
    o_que_fazer: 'Revogue a chave no painel do fornecedor e crie outra. Guarde-a apenas em variavel segura.',
  },
  generic_secret_key: {
    titulo: 'Chave secreta exposta',
    risco_real: 'Uma chave secreta visivel da acesso a servicos e dados que deveriam ser privados.',
    o_que_fazer: 'Troque a chave no servico de origem e mantenha-a fora de textos e de codigo.',
  },
  supabase_secret: {
    titulo: 'Chave administrativa do banco exposta',
    risco_real: 'Essa chave ignora as regras de acesso e permite ler ou apagar todos os dados.',
    o_que_fazer: 'Gere uma chave nova no painel do banco agora e nao use mais a antiga.',
  },
  supabase_publishable: {
    titulo: 'Chave publica do banco em texto',
    risco_real: 'Essa chave e feita para o aplicativo, mas mostrada em textos ou registros facilita abusos.',
    o_que_fazer: 'Mantenha a chave apenas na configuracao do aplicativo e nao a escreva em mensagens ou registros.',
  },
  expo_push_token: {
    titulo: 'Endereco de notificacao exposto',
    risco_real: 'Com esse endereco, terceiros podem enviar avisos falsos ao seu aparelho.',
    o_que_fazer: 'Nao exiba esse endereco. Se vazou, saia da conta e entre de novo para gerar outro.',
  },
  password_kv: {
    titulo: 'Credencial escrita em texto',
    risco_real: 'Uma credencial em texto aberto pode ser lida por qualquer pessoa que veja a tela ou o registro.',
    o_que_fazer: 'Troque a credencial agora e nunca a digite fora dos campos de acesso.',
  },
  cid10: {
    titulo: 'Codigo de saude exposto',
    risco_real: 'Informacao de saude e sensivel e pode causar constrangimento ou discriminacao.',
    o_que_fazer: 'Retire o codigo do texto. O aplicativo nao precisa de informacao de saude.',
  },
  health_keyword: {
    titulo: 'Informacao de saude no texto',
    risco_real: 'Dados de saude sao sensiveis e a lei exige cuidado extra com eles.',
    o_que_fazer: 'Nao escreva detalhes de saude em nomes ou descricoes. Mantenha isso fora do aplicativo.',
  },
  geo_precise: {
    titulo: 'Localizacao exata exposta',
    risco_real: 'A posicao exata mostra onde fica sua propriedade e quando ela pode estar sozinha.',
    o_que_fazer: 'Prefira informar so a cidade. Compartilhe a posicao exata apenas com quem precisa.',
  },
  geo_single: {
    titulo: 'Parte de uma coordenada no texto',
    risco_real: 'Um valor de coordenada isolado pode ser somado a outros e revelar o local da propriedade.',
    o_que_fazer: 'Retire valores de coordenadas dos textos livres e use o mapa do aplicativo.',
  },
};
// TEMPLATES-END

export function templateFor(item: TemplateItem): TemplateResult {
  const t = TEMPLATES[item.rule_id] ?? {
    titulo: 'Dado sensivel detectado',
    risco_real: 'Um dado sensivel foi encontrado e pode ser usado de forma indevida.',
    o_que_fazer: 'Retire esse dado do texto e compartilhe so quando for realmente necessario.',
  };
  return { rule_id: item.rule_id, ...t, nivel: RULE_LEVEL[item.severity] ?? 'moderado', source: 'template' };
}
