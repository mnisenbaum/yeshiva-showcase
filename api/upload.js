export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
  const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !UPLOAD_PASSWORD) {
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  const rawBody = await new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  const { aluno, materia, titulo, descricao, senha, conteudo } = body;

  if (!aluno || !materia || !titulo || !senha || !conteudo) {
    return res.status(400).json({
      error: 'Campos obrigatórios: aluno, materia, titulo, senha, conteudo',
    });
  }

  if (senha !== UPLOAD_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  const materiasValidas = [
    'computacao', 'matematica', 'fisica', 'biologia',
    'historia', 'portugues', 'ingles',
  ];

  if (!materiasValidas.includes(materia)) {
    return res.status(400).json({
      error: `Matéria inválida. Use uma de: ${materiasValidas.join(', ')}`,
    });
  }

  const sanitize = (str) =>
    str
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const nomeArquivo = `${sanitize(aluno)}-${sanitize(titulo)}.html`;
  const caminho = `conteudo/${materia}/${nomeArquivo}`;
  const data = new Date().toISOString();

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github.v3+json',
  };

  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

  try {
    const conteudoBase64 = Buffer.from(conteudo).toString('base64');

    let shaExistente = null;
    try {
      const checkRes = await fetch(
        `${apiBase}/contents/${caminho}?ref=${GITHUB_BRANCH}`,
        { headers }
      );
      if (checkRes.ok) {
        const fileData = await checkRes.json();
        shaExistente = fileData.sha;
      }
    } catch {}

    const filePayload = {
      message: `Upload: ${aluno} — ${titulo} (${materia})`,
      content: conteudoBase64,
      branch: GITHUB_BRANCH,
    };
    if (shaExistente) filePayload.sha = shaExistente;

    const fileRes = await fetch(`${apiBase}/contents/${caminho}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(filePayload),
    });

    if (!fileRes.ok) {
      const err = await fileRes.json();
      return res.status(502).json({
        error: 'Erro ao salvar arquivo no GitHub',
        detalhe: err.message,
      });
    }

    const manifestPath = 'data/manifest.json';
    let manifest = { submissoes: [] };
    let manifestSha = null;

    try {
      const manifestRes = await fetch(
        `${apiBase}/contents/${manifestPath}?ref=${GITHUB_BRANCH}`,
        { headers }
      );
      if (manifestRes.ok) {
        const manifestData = await manifestRes.json();
        manifestSha = manifestData.sha;
        const decoded = Buffer.from(manifestData.content, 'base64').toString('utf-8');
        manifest = JSON.parse(decoded);
      }
    } catch {}

    const novaEntrada = {
      id: `${materia}-${nomeArquivo.replace('.html', '')}-${Date.now()}`,
      aluno,
      materia,
      titulo,
      descricao: descricao || '',
      arquivo: caminho,
      data,
    };

    manifest.submissoes.push(novaEntrada);

    const manifestPayload = {
      message: `Manifest: ${aluno} — ${titulo}`,
      content: Buffer.from(JSON.stringify(manifest, null, 2)).toString('base64'),
      branch: GITHUB_BRANCH,
    };
    if (manifestSha) manifestPayload.sha = manifestSha;

    const manifestRes = await fetch(`${apiBase}/contents/${manifestPath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(manifestPayload),
    });

    if (!manifestRes.ok) {
      return res.status(502).json({
        error: 'Arquivo salvo, mas erro ao atualizar o manifesto',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Trabalho enviado com sucesso! Ele aparecerá no site em alguns segundos.',
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro interno do servidor',
      detalhe: error.message,
    });
  }
}
