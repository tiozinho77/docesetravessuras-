// Arquivo: app.js

// --- 1. CONFIGURAÇÃO DA CONEXÃO SUPABASE ---
// Cole suas chaves copiadas do painel do Supabase aqui
const SUPABASE_URL = 'https://yukwubfqolabbmwajvcp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1a3d1YmZxb2xhYmJtd2FqdmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTY3MzYsImV4cCI6MjA3MTA5MjczNn0.PC2JMwbmdfsksjq9KXUq5bhjayE_ekO5LK1l7vd4pas';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase conectado:', sb);

// --- 2. ESTADO DO APLICATIVO (Onde guardamos os dados) ---
let produtos = []; // Lista de produtos vindos do banco
let carrinho = []; // O carrinho do cliente (ex: [{ id: 1, nome: 'Produto A', preco: 10.0, qtd: 1 }])

// Referências aos elementos do HTML
const divListaProdutos = document.getElementById('lista-produtos');
const divCarrinho = document.getElementById('carrinho');
const spanTotal = document.getElementById('total-carrinho');
const btnFinalizar = document.getElementById('btn-finalizar');
const inputNome = document.getElementById('nome-cliente');
const inputTelefone = document.getElementById('telefone-cliente');
const inputEndereco = document.getElementById('endereco-cliente');
const divStatus = document.getElementById('mensagem-status');


// --- 3. CARREGAR PRODUTOS (SELECT na View) ---
async function carregarProdutos() {
    // 1. Faz o SELECT na View pública que criamos!
    const { data, error } = await sb
        .from('vitrine_publica') // Lendo da VIEW segura
        .select('*');

    if (error) {
        console.error('Erro ao buscar produtos:', error);
        divListaProdutos.innerHTML = "Erro ao carregar produtos.";
        return;
    }

    produtos = data;
    divListaProdutos.innerHTML = ""; // Limpa o "Carregando..."

    // 2. Renderiza os produtos na tela
    produtos.forEach(produto => {
        const divProduto = document.createElement('div');
        divProduto.className = 'produto';
        divProduto.innerHTML = `
            <h3>${produto.nome}</h3>
            <p>Preço: R$ ${produto.preco_venda.toFixed(2)}</p>
            <button onclick="adicionarAoCarrinho(${produto.id})">Adicionar ao Carrinho</button>
        `;
        divListaProdutos.appendChild(divProduto);
    });
}

// --- 4. LÓGICA DO CARRINHO (JavaScript Puro) ---
function adicionarAoCarrinho(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const itemExistente = carrinho.find(item => item.id === produtoId);

    if (itemExistente) {
        itemExistente.qtd++;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco_venda,
            qtd: 1
        });
    }
    atualizarCarrinhoUI();
}

function atualizarCarrinhoUI() {
    if (carrinho.length === 0) {
        divCarrinho.innerHTML = "Vazio";
        spanTotal.innerText = "0.00";
        return;
    }

    divCarrinho.innerHTML = "";
    let total = 0;

    carrinho.forEach(item => {
        const divItem = document.createElement('div');
        divItem.className = 'carrinho-item';
        divItem.innerHTML = `
            <span>${item.qtd}x ${item.nome}</span>
            <span>R$ ${(item.preco * item.qtd).toFixed(2)}</span>
        `;
        divCarrinho.appendChild(divItem);
        total += item.preco * item.qtd;
    });

    spanTotal.innerText = total.toFixed(2);
}

// --- 5. FINALIZAR PEDIDO (INSERT no Supabase) ---
async function finalizarPedido() {
    const nomeCliente = inputNome.value;
    const telefoneCliente = inputTelefone.value;
    const enderecoCliente = ""; // Adicione um campo de endereço se quiser
    
    if (carrinho.length === 0 || !nomeCliente || !telefoneCliente) {
        divStatus.innerText = "Por favor, adicione itens ao carrinho e preencha seu nome e telefone.";
        return;
    }

    divStatus.innerText = "Enviando pedido...";
    btnFinalizar.disabled = true;

    try {
        const total = parseFloat(spanTotal.innerText);

        // 1. Mapeia o carrinho para o formato esperado pela função SQL
        const itensParaSalvar = carrinho.map(item => ({
            produto_id: item.id,
            quantidade: item.qtd,
            preco_unitario: item.preco
        }));

        // 2. CHAMA A FUNÇÃO RPC (Substitui o insert)
        const { data: novoPedidoId, error } = await sb.rpc('criar_pedido_online', {
            // Os argumentos devem ter os mesmos nomes da função SQL
            nome_cliente: nomeCliente,
            telefone_cliente: telefoneCliente,
            endereco_cliente: enderecoCliente,
            total: total,
            itens: itensParaSalvar // Envia o array de itens
        });

        if (error) throw error;

        // 4. Sucesso!
        divStatus.innerText = `Pedido #${novoPedidoId} enviado com sucesso! Entraremos em contato.`;
        carrinho = [];
        atualizarCarrinhoUI();
        inputNome.value = "";
        inputTelefone.value = "";

    } catch (error) {
        console.error('Erro ao finalizar pedido:', error);
        divStatus.innerText = `Erro ao enviar pedido: ${error.message}`;
    } finally {
        btnFinalizar.disabled = false;
    }
}

// --- 6. INICIALIZAÇÃO ---
// Adiciona os "escutadores" de eventos
document.addEventListener('DOMContentLoaded', carregarProdutos);
btnFinalizar.addEventListener('click', finalizarPedido);