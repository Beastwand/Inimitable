const layoutBG = document.getElementById('parallaxGE');
const setup1 = layoutBG.getContext('2d');
const layoutBGWidth = layoutBG.width = 800;
const layoutBGHeight = layoutBG.height = 700;

let gameSpeed = 5;
const bgLayer1 = new Image();
bgLayer1.src = 'layer-1.png';
const bgLayer2 = new Image();
bgLayer2.src = 'layer-2.png';
const bgLayer3 = new Image();
bgLayer3.src = 'layer-3.png';
const bgLayer4 = new Image();
bgLayer4.src = 'layer-4.png';
const bgLayer5 = new Image();
bgLayer5.src = 'layer-5.png';

window.addEventListener('load',function(){
 const adjustGS = document.getElementById('adjustGS');
 adjustGS.value = gameSpeed;
 const showGameSpeed = document.getElementById('showGameSpeed');
 showGameSpeed.innerHTML = gameSpeed;
 adjustGS.addEventListener('change',function(mod){
  gameSpeed = mod.target.value;
  showGameSpeed.innerHTML = gameSpeed;
 })

 class bgLayer{
  constructor(img,speedMod){
   this.x = 0;
   this.y = 0;
   this.width = 2400;
   this.height = 700;
   this.img = img;
   this.speedMod = speedMod;
   this.speed = gameSpeed*this.speedMod;
  }
  update(){
   this.speed = gameSpeed*this.speedMod;
   if (this.x <= -this.width){
    this.x = 0;
   }
   this.x = Math.floor(this.x - this.speed);
  }
  draw(){
   setup1.drawImage(this.img,this.x,this.y,this.width,this.height);
   setup1.drawImage(this.img,this.x + this.width,this.y,this.width,this.height);
  }
 }

 const bgLayer1main = new bgLayer(bgLayer1,0.2);
 const bgLayer2main = new bgLayer(bgLayer2,0.4);
 const bgLayer3main = new bgLayer(bgLayer3,0.6);
 const bgLayer4main = new bgLayer(bgLayer4,0.8);
 const bgLayer5main = new bgLayer(bgLayer5,1);

 const gameLayers = [bgLayer1main, bgLayer2main, bgLayer3main, bgLayer4main, bgLayer5main];

 function animate(){
  setup1.clearRect(0,0,layoutBGWidth,layoutBGHeight);
  gameLayers.forEach(gLayers => {
   gLayers.update();
   gLayers.draw();
  })
  requestAnimationFrame(animate);
 }
 animate();
})