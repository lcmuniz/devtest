"use client";

import React, { useState, useMemo } from "react";
import {
  TipoCriterioBarema,
  ProcessoSeletivoInput,
} from "@/domain/processo-seletivo/processo-seletivo";
import { ProcessoSeletivoEntity } from "@/infrastructure/repositories/processo-seletivo-repository";
import {
  DesafioEntity,
  sortearDesafiosPorLinguagem,
  adicionarDesafioAComposicao,
  removerDesafioDaComposicao,
} from "@/domain/desafio/desafio";

interface ProcessosSeletivosBancaProps {
  processosIniciais?: ProcessoSeletivoEntity[];
  desafiosBanco?: DesafioEntity[];
  onSalvar?: (
    dados: ProcessoSeletivoInput
  ) => Promise<{ sucesso: boolean; processoSeletivo?: ProcessoSeletivoEntity; erros?: string[] }>;
  onAtualizar?: (
    id: string,
    dados: ProcessoSeletivoInput
  ) => Promise<{ sucesso: boolean; processoSeletivo?: ProcessoSeletivoEntity; erros?: string[] }>;
}

function paraDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function getCategoriaBadgeClass(categoria?: string): string {
  const cat = (categoria || "pleno").toLowerCase();
  if (cat === "junior") return "bg-sky-100 text-sky-800 border border-sky-200";
  if (cat === "senior") return "bg-amber-100 text-amber-800 border border-amber-200";
  return "bg-purple-100 text-purple-800 border border-purple-200";
}

function formatarCategoria(categoria?: string): string {
  const cat = (categoria || "pleno").toLowerCase();
  if (cat === "junior") return "Júnior";
  if (cat === "senior") return "Sênior";
  return "Pleno";
}

export const CRITERIOS_PADRAO = [
  {
    tipo: TipoCriterioBarema.EXPERIENCIA_PROFISSIONAL,
    descricao: "Anos de experiência profissional comprovada na área de desenvolvimento",
    pontuacaoUnitaria: 2.0,
    pontuacaoMaxima: 20.0,
    permiteMultiplos: true,
    exigeComprovante: true,
  },
  {
    tipo: TipoCriterioBarema.ESPECIALIZACAO,
    descricao: "Pós-graduação Lato Sensu em Computação, Engenharia de Software ou afins",
    pontuacaoUnitaria: 10.0,
    pontuacaoMaxima: 10.0,
    permiteMultiplos: false,
    exigeComprovante: true,
  },
  {
    tipo: TipoCriterioBarema.MESTRADO,
    descricao: "Mestrado Stricto Sensu em Ciência da Computação ou afins",
    pontuacaoUnitaria: 20.0,
    pontuacaoMaxima: 20.0,
    permiteMultiplos: false,
    exigeComprovante: true,
  },
  {
    tipo: TipoCriterioBarema.DOUTORADO,
    descricao: "Doutorado Stricto Sensu em Ciência da Computação ou afins",
    pontuacaoUnitaria: 30.0,
    pontuacaoMaxima: 30.0,
    permiteMultiplos: false,
    exigeComprovante: true,
  },
  {
    tipo: TipoCriterioBarema.CERTIFICACAO,
    descricao: "Certificações técnicas oficiais emitidas por órgãos/fornecedores globais",
    pontuacaoUnitaria: 5.0,
    pontuacaoMaxima: 20.0,
    permiteMultiplos: true,
    exigeComprovante: true,
  },
];

export function ProcessosSeletivosBanca({
  processosIniciais = [],
  desafiosBanco = [],
  onSalvar,
  onAtualizar,
}: ProcessosSeletivosBancaProps) {
  const [processos, setProcessos] = useState<ProcessoSeletivoEntity[]>(processosIniciais);
  const [exibirFormulario, setExibirFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Form State
  const [titulo, setTitulo] = useState("");
  const [edital, setEdital] = useState("");
  const [descricao, setDescricao] = useState("");
  const [inicioInscricoes, setInicioInscricoes] = useState("");
  const [fimInscricoes, setFimInscricoes] = useState("");
  const [inicioProvas, setInicioProvas] = useState("");
  const [fimProvas, setFimProvas] = useState("");
  const [pesoTecnico, setPesoTecnico] = useState(60);
  const [pesoBarema, setPesoBarema] = useState(40);
  const [notaCorte, setNotaCorte] = useState(50);

  // Trilhas State
  const [trilhas, setTrilhas] = useState<{ id?: string; nome: string; descricao: string }[]>([
    { nome: "Backend Java", descricao: "Java 21 e Spring Boot" },
  ]);
  const [novaTrilhaNome, setNovaTrilhaNome] = useState("");
  const [novaTrilhaDescricao, setNovaTrilhaDescricao] = useState("");

  // Barema State
  const [barema, setBarema] = useState(CRITERIOS_PADRAO);

  // Composição de Desafios no Formulário (Criação/Edição)
  const [trilhaFormAtivaIndex, setTrilhaFormAtivaIndex] = useState<number>(0);
  const [desafiosSelecionadosIds, setDesafiosSelecionadosIds] = useState<string[]>([]);
  const [cotaJava, setCotaJava] = useState<number>(0);
  const [cotaPython, setCotaPython] = useState<number>(0);
  const [cotaTypeScript, setCotaTypeScript] = useState<number>(0);
  const [categoriasSorteio, setCategoriasSorteio] = useState<string[]>(["junior", "pleno", "senior"]);
  const [termoBuscaDesafio, setTermoBuscaDesafio] = useState<string>("");
  const [categoriasFiltroBusca, setCategoriasFiltroBusca] = useState<string[]>(["junior", "pleno", "senior"]);

  // Gerenciador de Desafios em Processo Existente
  const [processoGerenciandoDesafios, setProcessoGerenciandoDesafios] =
    useState<ProcessoSeletivoEntity | null>(null);
  const [gerenciadorTrilhaAtivaId, setGerenciadorTrilhaAtivaId] = useState<string>("");
  const [desafiosAnexadosAoProcesso, setDesafiosAnexadosAoProcesso] = useState<DesafioEntity[]>([]);
  const [carregandoDesafiosProcesso, setCarregandoDesafiosProcesso] = useState(false);
  const [gerenciadorCotaJava, setGerenciadorCotaJava] = useState<number>(0);
  const [gerenciadorCotaPython, setGerenciadorCotaPython] = useState<number>(0);
  const [gerenciadorCotaTypeScript, setGerenciadorCotaTypeScript] = useState<number>(0);
  const [gerenciadorCategoriasSorteio, setGerenciadorCategoriasSorteio] = useState<string[]>(["junior", "pleno", "senior"]);
  const [gerenciadorTermoBusca, setGerenciadorTermoBusca] = useState<string>("");
  const [gerenciadorCategoriasFiltro, setGerenciadorCategoriasFiltro] = useState<string[]>(["junior", "pleno", "senior"]);
  const [avisoSorteioForm, setAvisoSorteioForm] = useState<string | null>(null);
  const [avisoSorteioGerenciador, setAvisoSorteioGerenciador] = useState<string | null>(null);

  const somaPesos = Number(pesoTecnico) + Number(pesoBarema);
  const pesosValidos = Math.abs(somaPesos - 100) < 0.001;

  const somaTetosBarema = barema.reduce((acc, c) => acc + Number(c.pontuacaoMaxima || 0), 0);
  const tetosBaremaValidos = Math.abs(somaTetosBarema - 100) < 0.001;

  const handleAbrirNovo = () => {
    setEditandoId(null);
    setTitulo("");
    setEdital("");
    setDescricao("");
    setInicioInscricoes("");
    setFimInscricoes("");
    setInicioProvas("");
    setFimProvas("");
    setPesoTecnico(60);
    setPesoBarema(40);
    setNotaCorte(50);
    setTrilhas([{ nome: "Backend Java", descricao: "Java 21 e Spring Boot" }]);
    setBarema(CRITERIOS_PADRAO);
    setTrilhaFormAtivaIndex(0);
    setDesafiosSelecionadosIds([]);
    setCotaJava(0);
    setCotaPython(0);
    setCotaTypeScript(0);
    setCategoriasSorteio(["junior", "pleno", "senior"]);
    setTermoBuscaDesafio("");
    setCategoriasFiltroBusca(["junior", "pleno", "senior"]);
    setMensagemErro(null);
    setExibirFormulario(true);
  };

  const handleEditarProcesso = (proc: ProcessoSeletivoEntity) => {
    setEditandoId(proc.id);
    setTitulo(proc.titulo);
    setEdital(proc.edital);
    setDescricao(proc.descricao || "");
    setInicioInscricoes(paraDatetimeLocal(proc.inicioInscricoes));
    setFimInscricoes(paraDatetimeLocal(proc.fimInscricoes));
    setInicioProvas(paraDatetimeLocal(proc.inicioProvas));
    setFimProvas(paraDatetimeLocal(proc.fimProvas));
    setPesoTecnico(proc.pesoProvaTecnica);
    setPesoBarema(proc.pesoBaremaCurricular);
    setNotaCorte(proc.notaCorteMinima);
    setTrilhas(
      proc.trilhas.map((t) => ({
        id: t.id,
        nome: t.nome,
        descricao: t.descricao || "",
      }))
    );
    setBarema(
      proc.barema.map((b) => ({
        tipo: b.tipo,
        descricao: b.descricao,
        pontuacaoUnitaria: b.pontuacaoUnitaria,
        pontuacaoMaxima: b.pontuacaoMaxima,
        permiteMultiplos: b.permiteMultiplos ?? false,
        exigeComprovante: b.exigeComprovante ?? true,
      }))
    );
    setTrilhaFormAtivaIndex(0);
    setDesafiosSelecionadosIds([]);
    setCotaJava(0);
    setCotaPython(0);
    setCotaTypeScript(0);
    setCategoriasSorteio(["junior", "pleno", "senior"]);
    setTermoBuscaDesafio("");
    setCategoriasFiltroBusca(["junior", "pleno", "senior"]);
    setMensagemErro(null);
    setExibirFormulario(true);

    // Carrega desafios vinculados a esse processo existente
    fetch(`/api/processos-seletivos/${proc.id}/desafios`)
      .then((res) => res.json())
      .then((dados) => {
        if (dados.sucesso && Array.isArray(dados.desafios)) {
          setDesafiosSelecionadosIds(dados.desafios.map((d: DesafioEntity) => d.id));
        }
      })
      .catch(() => {});
  };

  const handleAdicionarTrilha = () => {
    if (!novaTrilhaNome.trim()) return;
    setTrilhas([...trilhas, { nome: novaTrilhaNome.trim(), descricao: novaTrilhaDescricao.trim() }]);
    setNovaTrilhaNome("");
    setNovaTrilhaDescricao("");
  };

  const handleRemoverTrilha = (index: number) => {
    setTrilhas(trilhas.filter((_, i) => i !== index));
  };

  const handleBaremaChange = (index: number, campo: "pontuacaoUnitaria" | "pontuacaoMaxima", valor: number) => {
    setBarema(
      barema.map((criterio, i) =>
        i === index ? { ...criterio, [campo]: valor } : criterio
      )
    );
  };

  // Funções de Composição de Desafios do Formulário
  const handleToggleCategoriaSorteio = (cat: string, checked: boolean) => {
    setAvisoSorteioForm(null);
    if (checked) {
      setCategoriasSorteio([...categoriasSorteio, cat]);
    } else {
      setCategoriasSorteio(categoriasSorteio.filter((c) => c !== cat));
    }
  };

  const handleToggleCategoriaBusca = (cat: string, checked: boolean) => {
    if (checked) {
      setCategoriasFiltroBusca([...categoriasFiltroBusca, cat]);
    } else {
      setCategoriasFiltroBusca(categoriasFiltroBusca.filter((c) => c !== cat));
    }
  };

  const handleSortearDesafios = () => {
    setAvisoSorteioForm(null);
    if (categoriasSorteio.length === 0) {
      setAvisoSorteioForm("Nenhuma categoria selecionada para o sorteio. Selecione ao menos uma categoria.");
      return;
    }
    const totalCotas = (Number(cotaJava) || 0) + (Number(cotaPython) || 0) + (Number(cotaTypeScript) || 0);
    if (totalCotas <= 0) {
      setAvisoSorteioForm("Informe a quantidade desejada de desafios para sortear.");
      return;
    }
    if (desafiosDisponiveisSorteioForm.length === 0) {
      setAvisoSorteioForm("Não há desafios disponíveis na base para as categorias selecionadas.");
      return;
    }

    const sorteados = sortearDesafiosPorLinguagem(
      desafiosBanco.filter((d) => !desafiosSelecionadosIds.includes(d.id)),
      {
        java: Number(cotaJava) || 0,
        python: Number(cotaPython) || 0,
        typescript: Number(cotaTypeScript) || 0,
      },
      categoriasSorteio
    );

    if (sorteados.length === 0) {
      setAvisoSorteioForm("Nenhum desafio encontrado para as categorias e cotas de linguagem informadas.");
      return;
    }

    const novosIds = sorteados.map((d) => d.id);
    setDesafiosSelecionadosIds((prev) => {
      const acumulados = [...prev];
      for (const id of novosIds) {
        if (!acumulados.includes(id)) {
          acumulados.push(id);
        }
      }
      return acumulados;
    });
  };

  const handleVincularDesafio = (id: string) => {
    setDesafiosSelecionadosIds((prev) => adicionarDesafioAComposicao(prev, id));
  };

  const handleRemoverDesafio = (id: string) => {
    setDesafiosSelecionadosIds((prev) => removerDesafioDaComposicao(prev, id));
  };

  // Funções do Gerenciador de Desafios em Processo Existente (Drawer)
  const handleAbrirGerenciadorDesafios = async (proc: ProcessoSeletivoEntity, trilhaId?: string) => {
    if (processoGerenciandoDesafios?.id === proc.id && !trilhaId) {
      setProcessoGerenciandoDesafios(null);
      return;
    }
    const targetTrilhaId = trilhaId || proc.trilhas[0]?.id || "";
    setProcessoGerenciandoDesafios(proc);
    setGerenciadorTrilhaAtivaId(targetTrilhaId);
    setCarregandoDesafiosProcesso(true);
    setAvisoSorteioGerenciador(null);
    setGerenciadorTermoBusca("");
    setGerenciadorCategoriasFiltro(["junior", "pleno", "senior"]);
    try {
      const url = targetTrilhaId
        ? `/api/processos-seletivos/${proc.id}/desafios?trilhaId=${encodeURIComponent(targetTrilhaId)}`
        : `/api/processos-seletivos/${proc.id}/desafios`;
      const res = await fetch(url);
      const dados = await res.json();
      if (dados.sucesso && Array.isArray(dados.desafios)) {
        setDesafiosAnexadosAoProcesso(dados.desafios);
      }
    } catch {
      // Ignora erro de requisição em mock
    } finally {
      setCarregandoDesafiosProcesso(false);
    }
  };

  const handleTrocarTrilhaGerenciador = async (trilhaId: string) => {
    if (!processoGerenciandoDesafios) return;
    setGerenciadorTrilhaAtivaId(trilhaId);
    setCarregandoDesafiosProcesso(true);
    setAvisoSorteioGerenciador(null);
    try {
      const res = await fetch(
        `/api/processos-seletivos/${processoGerenciandoDesafios.id}/desafios?trilhaId=${encodeURIComponent(trilhaId)}`
      );
      const dados = await res.json();
      if (dados.sucesso && Array.isArray(dados.desafios)) {
        setDesafiosAnexadosAoProcesso(dados.desafios);
      }
    } catch {
      // Ignora erro
    } finally {
      setCarregandoDesafiosProcesso(false);
    }
  };

  const handleToggleGerenciadorCategoriaSorteio = (cat: string, checked: boolean) => {
    setAvisoSorteioGerenciador(null);
    if (checked) {
      setGerenciadorCategoriasSorteio([...gerenciadorCategoriasSorteio, cat]);
    } else {
      setGerenciadorCategoriasSorteio(gerenciadorCategoriasSorteio.filter((c) => c !== cat));
    }
  };

  const handleToggleGerenciadorCategoriaBusca = (cat: string, checked: boolean) => {
    if (checked) {
      setGerenciadorCategoriasFiltro([...gerenciadorCategoriasFiltro, cat]);
    } else {
      setGerenciadorCategoriasFiltro(gerenciadorCategoriasFiltro.filter((c) => c !== cat));
    }
  };

  const handleSortearEAnexarAoProcesso = async () => {
    if (!processoGerenciandoDesafios) return;
    setAvisoSorteioGerenciador(null);
    if (gerenciadorCategoriasSorteio.length === 0) {
      setAvisoSorteioGerenciador("Nenhuma categoria selecionada para o sorteio.");
      return;
    }
    const totalCotas = (Number(gerenciadorCotaJava) || 0) + (Number(gerenciadorCotaPython) || 0) + (Number(gerenciadorCotaTypeScript) || 0);
    if (totalCotas <= 0) {
      setAvisoSorteioGerenciador("Informe a quantidade desejada de desafios para sortear.");
      return;
    }
    if (desafiosDisponiveisSorteioGerenciador.length === 0) {
      setAvisoSorteioGerenciador("Não há desafios disponíveis na base para as categorias selecionadas.");
      return;
    }

    setCarregandoDesafiosProcesso(true);
    try {
      const res = await fetch(`/api/processos-seletivos/${processoGerenciandoDesafios.id}/desafios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sorteio: {
            java: Number(gerenciadorCotaJava) || 0,
            python: Number(gerenciadorCotaPython) || 0,
            typescript: Number(gerenciadorCotaTypeScript) || 0,
          },
          categorias: gerenciadorCategoriasSorteio,
          trilhaId: gerenciadorTrilhaAtivaId || undefined,
        }),
      });
      const dados = await res.json();
      if (dados.sucesso && Array.isArray(dados.desafios)) {
        if (dados.desafios.length === desafiosAnexadosAoProcesso.length) {
          setAvisoSorteioGerenciador("Nenhum desafio novo pôde ser sorteado para as cotas informadas.");
        }
        setDesafiosAnexadosAoProcesso(dados.desafios);
      }
    } finally {
      setCarregandoDesafiosProcesso(false);
    }
  };

  const handleVincularDesafioAoProcesso = async (desafioId: string) => {
    if (!processoGerenciandoDesafios) return;
    setCarregandoDesafiosProcesso(true);
    try {
      const res = await fetch(`/api/processos-seletivos/${processoGerenciandoDesafios.id}/desafios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desafiosIds: [desafioId],
          trilhaId: gerenciadorTrilhaAtivaId || undefined,
        }),
      });
      const dados = await res.json();
      if (dados.sucesso && Array.isArray(dados.desafios)) {
        setDesafiosAnexadosAoProcesso(dados.desafios);
      }
    } finally {
      setCarregandoDesafiosProcesso(false);
    }
  };

  const handleDesvincularDesafioDoProcesso = async (desafioId: string) => {
    if (!processoGerenciandoDesafios) return;
    setCarregandoDesafiosProcesso(true);
    try {
      const queryTrilha = gerenciadorTrilhaAtivaId ? `&trilhaId=${encodeURIComponent(gerenciadorTrilhaAtivaId)}` : "";
      const res = await fetch(
        `/api/processos-seletivos/${processoGerenciandoDesafios.id}/desafios?desafioId=${desafioId}${queryTrilha}`,
        { method: "DELETE" }
      );
      const dados = await res.json();
      if (dados.sucesso && Array.isArray(dados.desafios)) {
        setDesafiosAnexadosAoProcesso(dados.desafios);
      }
    } finally {
      setCarregandoDesafiosProcesso(false);
    }
  };

  const desafiosFiltradosBusca = useMemo(() => {
    return desafiosBanco.filter((d) => {
      if (desafiosSelecionadosIds.includes(d.id)) {
        return false;
      }
      const cat = (d.categoria || "pleno").toLowerCase();
      if (categoriasFiltroBusca.length === 0 || !categoriasFiltroBusca.includes(cat)) {
        return false;
      }
      if (termoBuscaDesafio.trim()) {
        const t = termoBuscaDesafio.toLowerCase();
        const matchTitulo = d.titulo.toLowerCase().includes(t);
        const matchLinguagem = d.linguagem.toLowerCase().includes(t);
        const matchEnunciado = (d.enunciadoMarkdown || "").toLowerCase().includes(t);
        if (!matchTitulo && !matchLinguagem && !matchEnunciado) return false;
      }
      return true;
    });
  }, [desafiosBanco, termoBuscaDesafio, categoriasFiltroBusca, desafiosSelecionadosIds]);

  const desafiosFiltradosBuscaGerenciador = useMemo(() => {
    return desafiosBanco.filter((d) => {
      if (desafiosAnexadosAoProcesso.some((a) => a.id === d.id)) {
        return false;
      }
      const cat = (d.categoria || "pleno").toLowerCase();
      if (gerenciadorCategoriasFiltro.length === 0 || !gerenciadorCategoriasFiltro.includes(cat)) {
        return false;
      }
      if (gerenciadorTermoBusca.trim()) {
        const t = gerenciadorTermoBusca.toLowerCase();
        const matchTitulo = d.titulo.toLowerCase().includes(t);
        const matchLinguagem = d.linguagem.toLowerCase().includes(t);
        const matchEnunciado = (d.enunciadoMarkdown || "").toLowerCase().includes(t);
        if (!matchTitulo && !matchLinguagem && !matchEnunciado) return false;
      }
      return true;
    });
  }, [desafiosBanco, gerenciadorTermoBusca, gerenciadorCategoriasFiltro, desafiosAnexadosAoProcesso]);

  const desafiosDisponiveisSorteioForm = useMemo(() => {
    return desafiosBanco.filter((d) => {
      if (desafiosSelecionadosIds.includes(d.id)) return false;
      const cat = (d.categoria || "pleno").toLowerCase();
      return categoriasSorteio.includes(cat);
    });
  }, [desafiosBanco, desafiosSelecionadosIds, categoriasSorteio]);

  const desafiosDisponiveisSorteioGerenciador = useMemo(() => {
    return desafiosBanco.filter((d) => {
      if (desafiosAnexadosAoProcesso.some((a) => a.id === d.id)) return false;
      const cat = (d.categoria || "pleno").toLowerCase();
      return gerenciadorCategoriasSorteio.includes(cat);
    });
  }, [desafiosBanco, desafiosAnexadosAoProcesso, gerenciadorCategoriasSorteio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro(null);

    if (!pesosValidos) {
      setMensagemErro("A soma dos pesos deve totalizar 100%.");
      return;
    }

    if (!tetosBaremaValidos) {
      setMensagemErro(`A soma dos tetos máximos do Barema Curricular deve totalizar 100 pontos (atual: ${somaTetosBarema} pts).`);
      return;
    }

    if (trilhas.length === 0) {
      setMensagemErro("Adicione ao menos uma trilha de conhecimento.");
      return;
    }

    const payload: ProcessoSeletivoInput = {
      titulo,
      edital,
      descricao,
      inicioInscricoes: inicioInscricoes ? new Date(inicioInscricoes).toISOString() : "",
      fimInscricoes: fimInscricoes ? new Date(fimInscricoes).toISOString() : "",
      inicioProvas: inicioProvas ? new Date(inicioProvas).toISOString() : "",
      fimProvas: fimProvas ? new Date(fimProvas).toISOString() : "",
      pesoProvaTecnica: Number(pesoTecnico),
      pesoBaremaCurricular: Number(pesoBarema),
      notaCorteMinima: Number(notaCorte),
      trilhas,
      barema,
      desafiosIds: desafiosSelecionadosIds,
      trilhaId: trilhas[trilhaFormAtivaIndex]?.id || undefined,
    };

    setSalvando(true);
    try {
      if (editandoId) {
        let resultado;
        if (onAtualizar) {
          resultado = await onAtualizar(editandoId, payload);
        } else {
          const response = await fetch(`/api/processos-seletivos/${editandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          resultado = await response.json();
        }

        if (resultado.sucesso && resultado.processoSeletivo) {
          // Atualiza também os desafios vinculados caso haja rota disponível
          if (desafiosSelecionadosIds.length > 0) {
            await fetch(`/api/processos-seletivos/${editandoId}/desafios`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ desafiosIds: desafiosSelecionadosIds }),
            }).catch(() => {});
          }

          setProcessos(
            processos.map((p) =>
              p.id === editandoId ? resultado.processoSeletivo! : p
            )
          );
          setExibirFormulario(false);
          setEditandoId(null);
        } else if (resultado.erros && resultado.erros.length > 0) {
          setMensagemErro(resultado.erros.join(" | "));
        }
      } else {
        let resultado;
        if (onSalvar) {
          resultado = await onSalvar(payload);
        } else {
          const response = await fetch("/api/processos-seletivos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          resultado = await response.json();
        }

        if (resultado.sucesso && resultado.processoSeletivo) {
          setProcessos([resultado.processoSeletivo, ...processos]);
          setExibirFormulario(false);
          setTitulo("");
          setEdital("");
          setDescricao("");
          setDesafiosSelecionadosIds([]);
        } else if (resultado.erros && resultado.erros.length > 0) {
          setMensagemErro(resultado.erros.join(" | "));
        }
      }
    } catch (err: any) {
      setMensagemErro(err.message || "Falha ao conectar com o servidor.");
    } finally {
      setSalvando(false);
    }
  };

  const desafiosSelecionados = desafiosBanco.filter((d) =>
    desafiosSelecionadosIds.includes(d.id)
  );

  const desafiosDisponiveisParaSelecao = desafiosBanco.filter(
    (d) => !desafiosSelecionadosIds.includes(d.id)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header DevTest */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded tracking-wider uppercase">
                DevTest
              </span>
              <span className="text-xs text-slate-500 font-medium">Banca Avaliadora</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
              Processos Seletivos
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Parametrização oficial de editais, trilhas técnicas, matrizes de barema e desafios vinculados.
            </p>
          </div>

          <button
            type="button"
            onClick={() => (exibirFormulario ? setExibirFormulario(false) : handleAbrirNovo())}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            {exibirFormulario ? "Fechar Formulário" : "+ Novo Processo Seletivo"}
          </button>
        </div>

        {/* Formulário de Criação / Edição */}
        {exibirFormulario && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6"
          >
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editandoId ? "Editar Processo Seletivo" : "Cadastrar Novo Processo Seletivo"}
              </h2>
              <p className="text-xs text-slate-500">
                Preencha os dados do edital, defina os prazos, distribua os pesos, configure o barema e monte a prova prática com desafios do banco.
              </p>
            </div>

            {mensagemErro && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                {mensagemErro}
              </div>
            )}

            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="titulo" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Título do Processo Seletivo *
                </label>
                <input
                  id="titulo"
                  type="text"
                  required
                  placeholder="Ex: Processo Seletivo DevTest 2026/1 - Desenvolvedor"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-800 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="edital" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Número do Edital *
                </label>
                <input
                  id="edital"
                  type="text"
                  required
                  placeholder="Ex: Edital nº 01/2026 - DevTest"
                  value={edital}
                  onChange={(e) => setEdital(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-800 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="descricao" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Descrição / Objetivo
                </label>
                <textarea
                  id="descricao"
                  rows={2}
                  placeholder="Descrição sucinta dos objetivos e diretrizes da seleção..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Cronograma Oficial */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Cronograma Oficial</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="inicioInscricoes" className="block text-xs font-semibold text-slate-700 mb-1">
                    Início das Inscrições *
                  </label>
                  <input
                    id="inicioInscricoes"
                    type="datetime-local"
                    required
                    value={inicioInscricoes}
                    onChange={(e) => setInicioInscricoes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="fimInscricoes" className="block text-xs font-semibold text-slate-700 mb-1">
                    Término das Inscrições *
                  </label>
                  <input
                    id="fimInscricoes"
                    type="datetime-local"
                    required
                    value={fimInscricoes}
                    onChange={(e) => setFimInscricoes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="inicioProvas" className="block text-xs font-semibold text-slate-700 mb-1">
                    Início das Provas *
                  </label>
                  <input
                    id="inicioProvas"
                    type="datetime-local"
                    required
                    value={inicioProvas}
                    onChange={(e) => setInicioProvas(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="fimProvas" className="block text-xs font-semibold text-slate-700 mb-1">
                    Término das Provas *
                  </label>
                  <input
                    id="fimProvas"
                    type="datetime-local"
                    required
                    value={fimProvas}
                    onChange={(e) => setFimProvas(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Pesos e Nota de Corte */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Composição da Nota Final e Ponderação
                </h3>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    pesosValidos
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  Soma: {somaPesos}%
                </span>
              </div>

              {!pesosValidos && (
                <p className="text-xs text-red-600 font-medium">
                  A soma dos pesos deve totalizar 100%. (Técnica: {pesoTecnico}% + Barema: {pesoBarema}% = {somaPesos}%)
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="pesoProvaTecnica" className="block text-xs font-semibold text-slate-700 mb-1">
                    Peso da Prova Técnica (%) *
                  </label>
                  <input
                    id="pesoProvaTecnica"
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={pesoTecnico}
                    onChange={(e) => setPesoTecnico(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="pesoBaremaCurricular" className="block text-xs font-semibold text-slate-700 mb-1">
                    Peso do Barema Curricular (%) *
                  </label>
                  <input
                    id="pesoBaremaCurricular"
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={pesoBarema}
                    onChange={(e) => setPesoBarema(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="notaCorteMinima" className="block text-xs font-semibold text-slate-700 mb-1">
                    Nota de Corte Mínima Eliminatória (0 a 100) *
                  </label>
                  <input
                    id="notaCorteMinima"
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={notaCorte}
                    onChange={(e) => setNotaCorte(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Trilhas de Conhecimento */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Trilhas Técnicas Disponíveis
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nome da Trilha (ex: Backend Java, Frontend React)"
                  value={novaTrilhaNome}
                  onChange={(e) => setNovaTrilhaNome(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
                <input
                  type="text"
                  placeholder="Descrição da Trilha (opcional)"
                  value={novaTrilhaDescricao}
                  onChange={(e) => setNovaTrilhaDescricao(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={handleAdicionarTrilha}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-md hover:bg-slate-900 cursor-pointer"
                >
                  Adicionar Trilha
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {trilhas.map((trilha, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 bg-blue-50 text-blue-900 border border-blue-200 text-xs font-medium px-3 py-1.5 rounded-full"
                  >
                    <strong>{trilha.nome}</strong>
                    {trilha.descricao && <span className="text-blue-700">({trilha.descricao})</span>}
                    <button
                      type="button"
                      onClick={() => handleRemoverTrilha(idx)}
                      className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Matriz do Barema Curricular */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Matriz do Barema Curricular
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pontuações unitárias e tetos individuais por critério de barema.
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    tetosBaremaValidos
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  Teto Total: {somaTetosBarema} / 100 pts
                </span>
              </div>

              {!tetosBaremaValidos && (
                <p className="text-xs text-red-600 font-medium">
                  A soma dos tetos máximos da matriz do Barema Curricular deve totalizar 100 pontos.
                </p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="p-2">Critério</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 w-32">Pontos / Unidade</th>
                      <th className="p-2 w-32">Teto Máximo</th>
                      <th className="p-2 w-28">Múltiplos?</th>
                      <th className="p-2 w-28">Comprovante?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barema.map((criterio, idx) => (
                      <tr key={criterio.tipo} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 font-semibold text-slate-800">{criterio.tipo}</td>
                        <td className="p-2 text-slate-600">{criterio.descricao}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={criterio.pontuacaoUnitaria}
                            onChange={(e) =>
                              handleBaremaChange(idx, "pontuacaoUnitaria", Number(e.target.value))
                            }
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={criterio.pontuacaoMaxima}
                            onChange={(e) =>
                              handleBaremaChange(idx, "pontuacaoMaxima", Number(e.target.value))
                            }
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                          />
                        </td>
                        <td className="p-2 text-slate-500">
                          {criterio.permiteMultiplos ? "Sim (cumulativo)" : "Não (único)"}
                        </td>
                        <td className="p-2 text-slate-500">
                          {criterio.exigeComprovante ? "Obrigatório" : "Dispensado"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Composição de Desafios Técnicos do Processo */}
            <div className="border border-slate-200 rounded-lg p-5 space-y-4 bg-slate-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Composição da Prova Prática (Banco Global de Desafios)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina cotas por linguagem e sorteie aleatoriamente da base, ou selecione desafios manualmente para a trilha técnica.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-900">
                  {desafiosSelecionadosIds.length} desafio(s) selecionado(s)
                </span>
              </div>

              {/* Seletor de Trilha Técnica no Formulário */}
              {trilhas.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-blue-950 uppercase">
                      Trilha da Prova:
                    </span>
                    {trilhas.map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTrilhaFormAtivaIndex(idx)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${
                          trilhaFormAtivaIndex === idx
                            ? "bg-blue-700 text-white shadow-sm"
                            : "bg-white text-blue-900 hover:bg-blue-100 border border-blue-300"
                        }`}
                      >
                        Trilha: {t.nome || `Trilha ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-blue-800">
                    Definindo desafios para:{" "}
                    <strong>{trilhas[trilhaFormAtivaIndex]?.nome || `Trilha ${trilhaFormAtivaIndex + 1}`}</strong>
                  </span>
                </div>
              )}

              {/* Sorteio por Cotas de Linguagem e Categoria */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  1. Sorteio Automático por Linguagem e Categoria
                </span>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Categorias para o sorteio:
                  </label>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoriasSorteio.includes("junior")}
                        onChange={(e) => handleToggleCategoriaSorteio("junior", e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span>Júnior</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoriasSorteio.includes("pleno")}
                        onChange={(e) => handleToggleCategoriaSorteio("pleno", e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span>Pleno</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoriasSorteio.includes("senior")}
                        onChange={(e) => handleToggleCategoriaSorteio("senior", e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span>Sênior</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label htmlFor="cota-java" className="block text-xs font-medium text-slate-600 mb-1">
                      Java (JUnit 5)
                    </label>
                    <input
                      id="cota-java"
                      type="number"
                      min="0"
                      value={cotaJava}
                      onChange={(e) => setCotaJava(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="cota-python" className="block text-xs font-medium text-slate-600 mb-1">
                      Python (Pytest)
                    </label>
                    <input
                      id="cota-python"
                      type="number"
                      min="0"
                      value={cotaPython}
                      onChange={(e) => setCotaPython(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="cota-typescript" className="block text-xs font-medium text-slate-600 mb-1">
                      TypeScript (Vitest)
                    </label>
                    <input
                      id="cota-typescript"
                      type="number"
                      min="0"
                      value={cotaTypeScript}
                      onChange={(e) => setCotaTypeScript(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleSortearDesafios}
                      disabled={categoriasSorteio.length === 0 || desafiosDisponiveisSorteioForm.length === 0}
                      className="w-full px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded shadow-sm transition cursor-pointer"
                    >
                      🎲 Sortear e Adicionar
                    </button>
                  </div>
                </div>

                {categoriasSorteio.length === 0 ? (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    ⚠️ Selecione ao menos uma categoria para habilitar o sorteio.
                  </p>
                ) : desafiosDisponiveisSorteioForm.length === 0 ? (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    ⚠️ Não há desafios disponíveis na base para as categorias selecionadas ({categoriasSorteio.map(formatarCategoria).join(", ")}).
                  </p>
                ) : null}

                {avisoSorteioForm && (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    {avisoSorteioForm}
                  </p>
                )}
              </div>

              {/* Buscar e Vincular Desafios da Base */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  2. Buscar e Vincular Desafios da Base
                </span>

                <div className="space-y-2">
                  <input
                    type="text"
                    aria-label="Buscar desafios na base"
                    placeholder="Buscar por título, linguagem ou conteúdo..."
                    value={termoBuscaDesafio}
                    onChange={(e) => setTermoBuscaDesafio(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 pt-1">
                    <span className="font-medium text-slate-500">Filtrar por categoria:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoriasFiltroBusca.includes("junior")}
                        onChange={(e) => handleToggleCategoriaBusca("junior", e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span>Júnior</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoriasFiltroBusca.includes("pleno")}
                        onChange={(e) => handleToggleCategoriaBusca("pleno", e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span>Pleno</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoriasFiltroBusca.includes("senior")}
                        onChange={(e) => handleToggleCategoriaBusca("senior", e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span>Sênior</span>
                    </label>
                  </div>
                </div>

                {/* Lista de Resultados da Busca */}
                <div className="space-y-1.5 max-h-60 overflow-y-auto border border-slate-200 rounded p-2 bg-slate-50">
                  {desafiosFiltradosBusca.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      {categoriasFiltroBusca.length === 0
                        ? "Nenhuma categoria selecionada. Marque ao menos uma categoria para exibir desafios."
                        : "Nenhum desafio encontrado para os filtros informados."}
                    </div>
                  ) : (
                    desafiosFiltradosBusca.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-xs hover:border-slate-300 transition"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-slate-100 text-slate-800 font-mono font-bold px-2 py-0.5 rounded uppercase text-[11px]">
                            {d.linguagem}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${getCategoriaBadgeClass(
                              d.categoria
                            )}`}
                          >
                            {formatarCategoria(d.categoria)}
                          </span>
                          <span className="font-semibold text-slate-800">{d.titulo}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleVincularDesafio(d.id)}
                          className="px-3 py-1 text-xs font-semibold rounded cursor-pointer transition bg-blue-800 hover:bg-blue-900 text-white shadow-xs"
                        >
                          + Vincular
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lista dos Desafios Selecionados */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Desafios Anexados a Este Processo ({desafiosSelecionados.length})
                </span>
                {desafiosSelecionados.length === 0 ? (
                  <div className="p-4 bg-white rounded border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    Nenhum desafio selecionado ainda. Use o sorteio ou selecione manualmente acima.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {desafiosSelecionados.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-3 bg-white rounded border border-slate-200 text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-800 font-mono font-bold px-2 py-0.5 rounded uppercase">
                            {d.linguagem}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${getCategoriaBadgeClass(
                              d.categoria
                            )}`}
                          >
                            {formatarCategoria(d.categoria)}
                          </span>
                          <span className="font-semibold text-slate-800">{d.titulo}</span>
                          <span className="text-slate-400">({d.timeoutSeconds}s / {d.memoryLimitMb}MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverDesafio(d.id)}
                          className="text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ações do Formulário */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExibirFormulario(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
              >
                {salvando
                  ? "Salvando..."
                  : editandoId
                  ? "Salvar Alterações"
                  : "Salvar Processo Seletivo"}
              </button>
            </div>
          </form>
        )}

        {/* Listagem da Banca */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Processos Seletivos Cadastrados ({processos.length})
            </h2>
          </div>

          {processos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              Nenhum Processo Seletivo cadastrado até o momento. Clique em &quot;+ Novo Processo Seletivo&quot; para abrir o edital.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {processos.map((proc) => {
                const isGerenciandoDesafios = processoGerenciandoDesafios?.id === proc.id;
                return (
                  <div
                    key={proc.id}
                    className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-800 uppercase tracking-wide bg-blue-50 px-2 py-0.5 rounded">
                            {proc.edital}
                          </span>
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                            {proc.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">{proc.titulo}</h3>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAbrirGerenciadorDesafios(proc)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 cursor-pointer"
                        >
                          {isGerenciandoDesafios ? "Ocultar Desafios" : "🎯 Gerenciar Desafios"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditarProcesso(proc)}
                          className="text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
                        >
                          Editar Processo Seletivo
                        </button>
                      </div>
                    </div>

                    {proc.descricao && (
                      <p className="text-sm text-slate-600">{proc.descricao}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div>
                        <span className="font-semibold text-slate-700 block">Inscrições:</span>
                        <span className="text-slate-600">
                          {new Date(proc.inicioInscricoes).toLocaleDateString("pt-BR")} até{" "}
                          {new Date(proc.fimInscricoes).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      <div>
                        <span className="font-semibold text-slate-700 block">Provas Práticas:</span>
                        <span className="text-slate-600">
                          {new Date(proc.inicioProvas).toLocaleDateString("pt-BR")} até{" "}
                          {new Date(proc.fimProvas).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      <div>
                        <span className="font-semibold text-slate-700 block">Pesos & Nota de Corte:</span>
                        <span className="text-slate-600">
                          Técnica: {proc.pesoProvaTecnica}% | Barema: {proc.pesoBaremaCurricular}% (Corte: {proc.notaCorteMinima})
                        </span>
                      </div>
                    </div>

                    {/* Trilhas e Barema */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-600">Trilhas ({proc.trilhas.length}):</span>
                        {proc.trilhas.map((t) => (
                          <span
                            key={t.id}
                            className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-md font-medium"
                          >
                            {t.nome}
                          </span>
                        ))}
                      </div>

                      <div className="text-xs text-slate-500">
                        Critérios de Barema configurados: <strong>{proc.barema.length}</strong>
                      </div>
                    </div>

                    {/* Painel Inline de Gestão de Desafios do Processo */}
                    {isGerenciandoDesafios && (
                      <div className="mt-4 pt-4 border-t border-indigo-100 bg-indigo-50/50 p-4 rounded-lg space-y-4">
                        <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                            Composição de Desafios da Prova Prática
                          </span>
                          {carregandoDesafiosProcesso && (
                            <span className="text-xs text-indigo-700 font-medium">Atualizando...</span>
                          )}
                        </div>

                        {/* Seletor de Trilha Técnica no Gerenciador Inline */}
                        {proc.trilhas.length > 0 && (
                          <div className="bg-indigo-100/70 p-3 rounded-lg border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-indigo-950 uppercase">
                                Trilha da Prova:
                              </span>
                              {proc.trilhas.map((t) => {
                                const isAtiva = (gerenciadorTrilhaAtivaId || proc.trilhas[0]?.id) === t.id;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleTrocarTrilhaGerenciador(t.id)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${
                                      isAtiva
                                        ? "bg-indigo-700 text-white shadow-sm"
                                        : "bg-white text-indigo-900 hover:bg-indigo-50 border border-indigo-300"
                                    }`}
                                  >
                                    Trilha: {t.nome}
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[11px] text-indigo-800 font-medium">
                              Configurando composição para:{" "}
                              <strong>
                                {proc.trilhas.find((t) => t.id === (gerenciadorTrilhaAtivaId || proc.trilhas[0]?.id))?.nome || proc.trilhas[0]?.nome}
                              </strong>
                            </span>
                          </div>
                        )}

                        {/* Sorteio Rápido para Processo Existente */}
                        <div className="bg-white p-3 rounded border border-indigo-100 space-y-2">
                          <span className="text-xs font-semibold text-slate-700">
                            Sortear e Vincular Mais Desafios da Base:
                          </span>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                            <span className="text-[11px] font-medium text-slate-500">Categorias:</span>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={gerenciadorCategoriasSorteio.includes("junior")}
                                onChange={(e) => handleToggleGerenciadorCategoriaSorteio("junior", e.target.checked)}
                                className="rounded border-slate-300 text-blue-600"
                              />
                              <span>Júnior</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={gerenciadorCategoriasSorteio.includes("pleno")}
                                onChange={(e) => handleToggleGerenciadorCategoriaSorteio("pleno", e.target.checked)}
                                className="rounded border-slate-300 text-blue-600"
                              />
                              <span>Pleno</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={gerenciadorCategoriasSorteio.includes("senior")}
                                onChange={(e) => handleToggleGerenciadorCategoriaSorteio("senior", e.target.checked)}
                                className="rounded border-slate-300 text-blue-600"
                              />
                              <span>Sênior</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                            <div>
                              <label className="text-[11px] text-slate-500 block">Java:</label>
                              <input
                                type="number"
                                min="0"
                                value={gerenciadorCotaJava}
                                onChange={(e) => setGerenciadorCotaJava(Number(e.target.value))}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-500 block">Python:</label>
                              <input
                                type="number"
                                min="0"
                                value={gerenciadorCotaPython}
                                onChange={(e) => setGerenciadorCotaPython(Number(e.target.value))}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-500 block">TypeScript:</label>
                              <input
                                type="number"
                                min="0"
                                value={gerenciadorCotaTypeScript}
                                onChange={(e) => setGerenciadorCotaTypeScript(Number(e.target.value))}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={handleSortearEAnexarAoProcesso}
                                disabled={gerenciadorCategoriasSorteio.length === 0 || desafiosDisponiveisSorteioGerenciador.length === 0 || carregandoDesafiosProcesso}
                                className="w-full py-1.5 px-3 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded cursor-pointer"
                              >
                                🎲 Sortear e Adicionar
                              </button>
                            </div>
                          </div>

                          {gerenciadorCategoriasSorteio.length === 0 ? (
                            <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                              ⚠️ Selecione ao menos uma categoria para habilitar o sorteio.
                            </p>
                          ) : desafiosDisponiveisSorteioGerenciador.length === 0 ? (
                            <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                              ⚠️ Não há desafios disponíveis na base para as categorias selecionadas ({gerenciadorCategoriasSorteio.map(formatarCategoria).join(", ")}).
                            </p>
                          ) : null}

                          {avisoSorteioGerenciador && (
                            <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                              {avisoSorteioGerenciador}
                            </p>
                          )}
                        </div>

                        {/* Buscar e Vincular Desafios ao Processo Existente */}
                        <div className="bg-white p-3 rounded border border-indigo-100 space-y-2">
                          <span className="text-xs font-semibold text-slate-700">
                            Buscar e Vincular Desafios da Base:
                          </span>
                          <input
                            type="text"
                            aria-label="Buscar desafios para o processo"
                            placeholder="Buscar por título, linguagem ou conteúdo..."
                            value={gerenciadorTermoBusca}
                            onChange={(e) => setGerenciadorTermoBusca(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                            <span className="text-[11px] font-medium text-slate-500">Categorias:</span>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={gerenciadorCategoriasFiltro.includes("junior")}
                                onChange={(e) => handleToggleGerenciadorCategoriaBusca("junior", e.target.checked)}
                                className="rounded border-slate-300 text-blue-600"
                              />
                              <span>Júnior</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={gerenciadorCategoriasFiltro.includes("pleno")}
                                onChange={(e) => handleToggleGerenciadorCategoriaBusca("pleno", e.target.checked)}
                                className="rounded border-slate-300 text-blue-600"
                              />
                              <span>Pleno</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={gerenciadorCategoriasFiltro.includes("senior")}
                                onChange={(e) => handleToggleGerenciadorCategoriaBusca("senior", e.target.checked)}
                                className="rounded border-slate-300 text-blue-600"
                              />
                              <span>Sênior</span>
                            </label>
                          </div>

                          <div className="space-y-1.5 max-h-52 overflow-y-auto border border-slate-200 rounded p-1.5 bg-slate-50">
                            {desafiosFiltradosBuscaGerenciador.length === 0 ? (
                              <div className="p-3 text-center text-xs text-slate-500">
                                {gerenciadorCategoriasFiltro.length === 0
                                  ? "Nenhuma categoria selecionada. Marque ao menos uma categoria para exibir desafios."
                                  : "Nenhum desafio encontrado para os filtros informados."}
                              </div>
                            ) : (
                              desafiosFiltradosBuscaGerenciador.map((d) => (
                                <div
                                  key={d.id}
                                  className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-xs hover:border-slate-300 transition"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="bg-slate-100 text-slate-800 font-mono font-bold px-1.5 py-0.5 rounded uppercase text-[10px]">
                                      {d.linguagem}
                                    </span>
                                    <span
                                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getCategoriaBadgeClass(
                                        d.categoria
                                      )}`}
                                    >
                                      {formatarCategoria(d.categoria)}
                                    </span>
                                    <span className="font-semibold text-slate-800">{d.titulo}</span>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={carregandoDesafiosProcesso}
                                    onClick={() => handleVincularDesafioAoProcesso(d.id)}
                                    className="px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs"
                                  >
                                    + Vincular
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Listagem dos Desafios Atuais Anexados */}
                        <div className="space-y-2 pt-3 border-t border-indigo-200">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-indigo-950">
                              Desafios da Trilha ({proc.trilhas.find((t) => t.id === (gerenciadorTrilhaAtivaId || proc.trilhas[0]?.id))?.nome || proc.titulo}): {desafiosAnexadosAoProcesso.length}
                            </h4>
                          </div>

                          {desafiosAnexadosAoProcesso.length === 0 ? (
                            <div className="p-3 bg-white rounded text-center text-xs text-slate-500 border border-dashed border-indigo-200">
                              Nenhum desafio vinculado a este processo seletivo ainda.
                            </div>
                          ) : (
                            desafiosAnexadosAoProcesso.map((d) => (
                              <div
                                key={d.id}
                                className="flex items-center justify-between p-2.5 bg-white rounded border border-indigo-100 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="bg-indigo-100 text-indigo-900 font-mono font-bold px-2 py-0.5 rounded uppercase text-[10px]">
                                    {d.linguagem}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getCategoriaBadgeClass(
                                      d.categoria
                                    )}`}
                                  >
                                    {formatarCategoria(d.categoria)}
                                  </span>
                                  <span className="font-semibold text-slate-800">{d.titulo}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDesvincularDesafioDoProcesso(d.id)}
                                  className="text-red-600 hover:text-red-800 font-semibold cursor-pointer text-xs"
                                >
                                  Desvincular
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
