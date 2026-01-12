const plateau = document.getElementById("plateau");
for (let i=0; i<42; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";
  plateau.appendChild(cell);
}

const cells = document.querySelectorAll(".cell");


function dropRandomPiece() {
  const col = Math.floor(Math.random()*7);
  for(let row=5; row>=0; row--){
    const index = row*7 + col;
    if(!cells[index].hasChildNodes()) {
      const piece = document.createElement("div");
      piece.className = "piece";
      piece.style.background = Math.random()<0.5
        ? "radial-gradient(circle at 30% 30%, #f87171, #b30000)"
        : "radial-gradient(circle at 30% 30%, #facc15, #b38f00)";
      cells[index].appendChild(piece);
      break;
    }
  }
}
setInterval(dropRandomPiece, 800);


for(let i=0;i<50;i++){
  const particle = document.createElement("div");
  particle.classList.add("particle");
  particle.style.left = Math.random()*100+"vw";
  particle.style.top = Math.random()*100+"vh";
  particle.style.width = 2 + Math.random()*8 + "px";
  particle.style.height = 2 + Math.random()*8 + "px";
  particle.style.animationDuration = 5 + Math.random()*5 + "s";
  document.body.appendChild(particle);
}


const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("createAccountForm") || document.getElementById("register-form");

document.getElementById("show-register").addEventListener("click",(e)=>{
  e.preventDefault();
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
});

document.getElementById("show-login").addEventListener("click",(e)=>{
  e.preventDefault();
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
});
