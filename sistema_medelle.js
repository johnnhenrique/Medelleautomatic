/**
 * 🏥 SISTEMA MEDELLE ESTÉTICA - VERSÃO FINAL COM TESTE DE EMAIL (CORRIGIDA)
 * ---------------------------------------------------------
 * * INSTRUÇÕES FINAIS PARA O EMAIL FUNCIONAR:
 * 1. Gere uma Senha de App no Google (Segurança > Verificação em 2 etapas > Senhas de App).
 * 2. Coloque seu email e essa senha nas variáveis abaixo (EMAIL_CLINICA, SENHA_APP).
 * 3. Rode: node sistema_medelle.js
 */

const express = require('express');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'banco_dados.json');

// --- CONFIGURAÇÕES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚠️ --- ÁREA DE CONFIGURAÇÃO DE E-MAIL (PREENCHA AQUI) --- ⚠️
const EMAIL_CLINICA = 'medelleestetica@gmail.com'; // <--- SEU GMAIL AQUI
const SENHA_APP = 'lcyn tarp wmqu egyx';        // <--- SENHA DE APP DO GOOGLE AQUI (16 letras)

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_CLINICA,
        pass: SENHA_APP
    }
});

// --- FUNÇÕES DE BANCO DE DADOS ---
const lerBanco = () => {
    try {
        if (!fs.existsSync(DB_FILE)) return [];
        const data = fs.readFileSync(DB_FILE);
        return JSON.parse(data);
    } catch (error) { return []; }
};

const salvarBanco = (dados) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2));
};

// --- ROTAS DA API ---

app.get('/', (req, res) => {
    res.send(FRONTEND_HTML);
});

app.get('/api/pacientes', (req, res) => {
    const dados = lerBanco();
    dados.sort((a, b) => new Date(a.returnDate) - new Date(b.returnDate));
    res.json(dados);
});

app.post('/api/pacientes', (req, res) => {
    const novoPaciente = req.body;
    if(!novoPaciente.name || !novoPaciente.returnDate || !novoPaciente.email) {
        return res.status(400).json({ erro: "Dados incompletos." });
    }
    novoPaciente.id = Date.now();
    const pacientes = lerBanco();
    pacientes.push(novoPaciente);
    salvarBanco(pacientes);
    console.log(`[NOVO] ${novoPaciente.name} cadastrado.`);
    res.status(201).json({ mensagem: "Sucesso" });
});

app.delete('/api/pacientes/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let pacientes = lerBanco();
    const novaLista = pacientes.filter(p => p.id !== id);
    salvarBanco(novaLista);
    res.json({ success: true });
});

// --- ROTA DE TESTE DE E-MAIL ---
app.post('/api/testar-envio', async (req, res) => {
    console.log("⚡ Teste manual de envio iniciado...");
    try {
        await transporter.sendMail({
            from: `"Medelle Sistema" <${EMAIL_CLINICA}>`,
            to: EMAIL_CLINICA,
            subject: 'Teste de Configuração - Medelle',
            text: 'Se você recebeu este e-mail, sua configuração de senha de app está funcionando perfeitamente! O sistema está pronto para enviar avisos aos pacientes.'
        });
        console.log("✅ E-mail de teste enviado com sucesso!");
        res.json({ mensagem: "E-mail de teste enviado! Verifique sua caixa de entrada." });
    } catch (error) {
        console.error("❌ Erro no teste de e-mail:", error);
        res.status(500).json({ erro: "Falha ao enviar. Verifique se o e-mail e a senha de app estão corretos no código." });
    }
});

// --- LÓGICA DE NOTIFICAÇÃO (COMPARTILHADA) ---
async function verificarEEnviarNotificacoes() {
    console.log('⏰ Verificando retornos para daqui a 48 horas...');
    
    const hoje = new Date();
    const alvo = new Date(hoje);
    alvo.setDate(hoje.getDate() + 2); // +2 dias (48h)
    const dataAlvoString = alvo.toISOString().split('T')[0];
    
    console.log(`🔎 Buscando agendamentos para: ${dataAlvoString}`);

    const pacientes = lerBanco();
    let enviados = 0;

    for (const p of pacientes) {
        if (p.returnDate === dataAlvoString) {
            await enviarEmailPaciente(p);
            enviados++;
        }
    }
    
    if(enviados === 0) console.log("Nenhum paciente para notificar hoje (regra 48h).");
}

async function enviarEmailPaciente(p) {
    if (!p.email) return;
    console.log(`🚀 Enviando aviso para: ${p.name}`);
    
    const dataBonita = p.returnDate.split('-').reverse().join('/');
    const corpoEmail = `
        Olá ${p.name},
        
        Lembrete Medelle Estética: Seu retorno para "${p.procedure}" está previsto para daqui a 48 horas (${dataBonita}).
        
        Aguardamos sua confirmação!
        
        Att, Medelle Estética.
    `;

    try {
        await transporter.sendMail({
            from: `"Medelle Estética" <${EMAIL_CLINICA}>`,
            to: p.email,
            cc: EMAIL_CLINICA,
            subject: 'Lembrete: Retorno em 48h - Medelle',
            text: corpoEmail
        });
        console.log(`✅ E-mail enviado para ${p.email}`);
    } catch (error) {
        console.error(`❌ Erro no envio para ${p.name}:`, error);
    }
}

// --- AUTOMAÇÃO (CRON JOB) ---
cron.schedule('0 9 * * *', verificarEEnviarNotificacoes);

// --- INICIALIZAÇÃO ---
app.listen(PORT, () => {
    console.log(`\n💎 MEDELLE ESTÉTICA - SISTEMA PRONTO`);
    console.log(`👉 Acesse: http://localhost:${PORT}`);
});

// --- INTERFACE (HTML ATUALIZADO) ---
const FRONTEND_HTML = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Medelle Estética</title>
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg-rose: #fff0f5; --rose-accent: #e6bccd;
            --gold-main: #d4af37; --gold-dark: #aa8c2c;
            --text-dark: #4a4a4a;
            --gold-gradient: linear-gradient(135deg, #d4af37 0%, #f6e6b4 50%, #d4af37 100%);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Lato', sans-serif; background-color: var(--bg-rose); color: var(--text-dark); padding: 20px; }
        .app-container { background-color: white; max-width: 1000px; margin: 0 auto; border-radius: 20px; box-shadow: 0 15px 35px rgba(212, 175, 55, 0.15); overflow: hidden; }
        header { background: var(--gold-gradient); padding: 30px; text-align: center; color: white; position: relative; }
        header h1 { font-family: 'Playfair Display', serif; font-size: 2.5rem; letter-spacing: 2px; }
        
        /* BOTÃO DE TESTE CORRIGIDO E DESTACADO */
        .test-btn {
            position: absolute; 
            top: 20px; 
            right: 20px;
            background: white; 
            border: none;
            color: var(--gold-dark); 
            padding: 10px 20px; 
            border-radius: 25px;
            cursor: pointer; 
            font-size: 0.9rem; 
            font-weight: bold;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            z-index: 100;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .test-btn:hover { 
            background: #fcfcfc; 
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(0,0,0,0.2);
        }

        .content-grid { display: grid; grid-template-columns: 1fr 1fr; min-height: 500px; }
        .form-section, .list-section { padding: 30px; }
        .form-section { border-right: 1px solid var(--rose-accent); }
        .list-section { background-color: #fffbfc; }
        
        h2 { font-family: 'Playfair Display', serif; color: var(--gold-dark); margin-bottom: 20px; border-bottom: 2px solid var(--rose-accent); }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9rem; }
        input { width: 100%; padding: 10px; border: 1px solid var(--rose-accent); border-radius: 5px; }
        
        .btn-gold { width: 100%; padding: 15px; background: var(--gold-main); color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; text-transform: uppercase; margin-top: 10px; transition: 0.3s; }
        .btn-gold:hover { background: var(--gold-dark); transform: translateY(-2px); }
        
        .patient-card { background: white; padding: 15px; margin-bottom: 10px; border-left: 4px solid var(--gold-main); box-shadow: 0 2px 5px rgba(0,0,0,0.05); position: relative; }
        .date-highlight { color: var(--gold-dark); font-weight: bold; display: block; margin-top: 5px; }
        .delete-btn { position: absolute; top: 15px; right: 15px; color: #ff6b6b; cursor: pointer; }

        @media (max-width: 768px) { 
            .content-grid { grid-template-columns: 1fr; } 
            /* Ajuste do botão no celular */
            .test-btn { position: static; margin: 15px auto; display: inline-flex; width: auto; } 
        }
    </style>
</head>
<body>
    <div class="app-container">
        <header>
            <h1>Medelle Estética</h1>
            <button class="test-btn" onclick="testarEnvio()">
                <i class="fas fa-paper-plane"></i> Testar E-mail
            </button>
        </header>

        <div class="content-grid">
            <div class="form-section">
                <h2>Novo Paciente</h2>
                <form id="clinicForm">
                    <div class="form-group"><label>Nome</label><input type="text" id="name" required></div>
                    <div class="form-group"><label>WhatsApp</label><input type="text" id="contact" required></div>
                    <div class="form-group" style="background: #fff8f8; padding: 10px; border-radius: 5px; border: 1px dashed var(--rose-accent);">
                        <label>📧 E-mail (Obrigatório)</label><input type="email" id="email" required>
                    </div>
                    <div class="form-group"><label>Procedimento</label><input type="text" id="procedure" required></div>
                    <div class="form-group"><label>Data Retorno</label><input type="date" id="returnDate" required></div>
                    <button type="submit" class="btn-gold">Salvar</button>
                </form>
            </div>

            <div class="list-section">
                <h2>Próximos Retornos</h2>
                <div id="patientList">Carregando...</div>
            </div>
        </div>
    </div>

    <script>
        const form = document.getElementById('clinicForm');
        const listDiv = document.getElementById('patientList');

        document.addEventListener('DOMContentLoaded', loadPatients);

        async function testarEnvio() {
            if(!confirm("Isso enviará um e-mail de teste para você mesmo para verificar se a senha de app está correta. Continuar?")) return;
            try {
                const res = await fetch('/api/testar-envio', { method: 'POST' });
                const data = await res.json();
                alert(data.mensagem || data.erro);
            } catch(e) { alert("Erro ao conectar com servidor."); }
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('name').value,
                contact: document.getElementById('contact').value,
                email: document.getElementById('email').value,
                procedure: document.getElementById('procedure').value,
                returnDate: document.getElementById('returnDate').value
            };
            await fetch('/api/pacientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            alert('Salvo!'); form.reset(); loadPatients();
        });

        async function loadPatients() {
            const res = await fetch('/api/pacientes');
            const patients = await res.json();
            listDiv.innerHTML = '';
            if(patients.length === 0) { listDiv.innerHTML = '<p style="color:#999; text-align:center;">Sem retornos.</p>'; return; }
            patients.forEach(p => {
                const dateFmt = p.returnDate.split('-').reverse().join('/');
                listDiv.innerHTML += \`
                    <div class="patient-card">
                        <h3>\${p.name}</h3>
                        <p>\${p.procedure}</p>
                        <p style="font-size:0.8rem;color:#888">\${p.email}</p>
                        <span class="date-highlight">Retorno: \${dateFmt}</span>
                        <i class="fas fa-trash delete-btn" onclick="deletePatient(\${p.id})"></i>
                    </div>\`;
            });
        }

        async function deletePatient(id) {
            if(confirm('Remover?')) { await fetch('/api/pacientes/'+id, { method: 'DELETE' }); loadPatients(); }
        }
    </script>
</body>
</html>
`;