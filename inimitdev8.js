let playerState = 'idle';
const chooseMenu = document.getElementById('anims');
chooseMenu.addEventListener('change',function(d){
 playerState = d.target.value;
})

const layoutPC = document.getElementById('gameLayout');
const setup = layoutPC.getContext('2d');
const layoutPCWidth = layoutPC.width = 600;
const layoutPCHeight = layoutPC.height = 600;

const playerImg = new Image();
playerImg.src = 'shadow_dog.png';
const spriteWidth = 575;
const spriteHeight = 523;
let frameX = 0;
let frameY = 0;
let spriteFrame = 0;
const slowFrames = 3;
const spriteAnims = [];
const animStates = [
 {name: 'idle', frames: 7},
 {name: 'jump', frames: 7},
 {name: 'fall', frames: 7},
 {name: 'run', frames: 9},
 {name: 'dizzy', frames: 11},
 {name: 'sit', frames: 5},
 {name: 'roll', frames: 7},
 {name: 'bite', frames: 7},
 {name: 'ko', frames: 12},
 {name: 'gethit', frames: 4}
];
animStates.forEach((state,sList) => {
 let frames = {fLoc: []}
 for (let i = 0; i < state.frames; i++){
  let posX = i*spriteWidth;
  let posY = sList*spriteHeight;
  frames.fLoc.push({x: posX,y: posY});
 }
 spriteAnims[state.name] = frames;
})

function animate(){
 setup.clearRect(0,0,layoutPCWidth,layoutPCHeight);
 let spritePosition = Math.floor(spriteFrame/slowFrames)%spriteAnims[playerState].fLoc.length;
 let frameX = spriteWidth*spritePosition;
 let frameY = spriteAnims[playerState].fLoc[spritePosition].y;
 setup.drawImage(playerImg,frameX,frameY,spriteWidth,spriteHeight,0,0,spriteWidth,spriteHeight);

 spriteFrame++;
 requestAnimationFrame(animate);
};
animate();