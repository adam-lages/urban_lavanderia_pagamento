# Branches deste repositório

Fluxo definido pelo dono. Nesta fase rápida, **todo código novo vai para `dev` sem abrir pull request**. Push direto.

## O que cada branch é

| Branch | Papel |
| --- | --- |
| **`dev`** | Código em andamento. Pode quebrar. Branch de trabalho. |
| **`hml`** | Quase finalizado. Ambiente de teste (homologação). |
| **`main`** | Produção. Só o que já foi testado. |

## Como trabalhar agora

1. Faça checkout de `dev` e atualize: `git checkout dev && git pull origin dev`.
2. Commit e **push em `dev`**. Sem PR.
3. Quando estiver estável o suficiente para testar de verdade, o dono leva `dev` → `hml`.
4. Produção (`main`) só recebe o que já passou por teste em `hml`. Não mergear em `main` no dia a dia.

Não apague `hml`. Não use `main` como branch de trabalho.
