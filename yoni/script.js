const canvas = document.getElementById('meuCanvas');
const ctx = canvas.getContext('2d');

// Ajusta o tamanho do canvas para o tamanho da janela
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particlesArray = [];
let hue = 0; // Usado para rotacionar as cores do arco-íris

// Objeto para rastrear a posição do mouse
const mouse = {
    x: undefined,
    y: undefined,
}

// Atualiza as coordenadas do mouse quando ele se move
canvas.addEventListener('mousemove', function(event){
    mouse.x = event.x;
    mouse.y = event.y;
    // Cria 5 partículas a cada movimento
    for (let i = 0; i < 5; i++){
        particlesArray.push(new Particle());
    }
});

// Cria uma explosão de partículas ao clicar
canvas.addEventListener('click', function(event){
    mouse.x = event.x;
    mouse.y = event.y;
    for (let i = 0; i < 20; i++){
        particlesArray.push(new Particle());
    }
});

// Classe que define como uma partícula nasce, se move e morre
class Particle {
    constructor() {
        this.x = mouse.x;
        this.y = mouse.y;
        this.size = Math.random() * 15 + 1; // Tamanho aleatório
        this.speedX = Math.random() * 3 - 1.5; // Velocidade horizontal aleatória
        this.speedY = Math.random() * 3 - 1.5; // Velocidade vertical aleatória
        this.color = 'hsl(' + hue + ', 100%, 50%)'; // Cor atualizada dinamicamente
    }

    // Atualiza a posição e diminui o tamanho da partícula
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.size > 0.2) this.size -= 0.1; // Vai encolhendo
    }

    // Desenha a partícula na tela
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Controla todas as partículas criadas
function handleParticles() {
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
       
        // Remove a partícula da memória se ela ficar muito pequena
        if (particlesArray[i].size <= 0.3) {
            particlesArray.splice(i, 1);
            i--;
        }
    }
}

// Função de animação que roda continuamente
function animate() {
    // Ao invés de limpar a tela toda, desenhamos um fundo preto levemente transparente
    // Isso cria o efeito visual de "rastro" (trailing) nas partículas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
   
    handleParticles();
   
    hue += 2; // Muda a cor levemente a cada frame
    requestAnimationFrame(animate); // Chama o próximo frame
}

// Redimensiona o canvas se a janela do navegador mudar de tamanho
window.addEventListener('resize', function(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Inicia a animação
animate();
