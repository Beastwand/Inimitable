const layoutEf = document.getElementById('SSGeffects');
const setup3 = layoutEf.getContext('2d');
layoutEf.width = 500;
layoutEf.height = 700;
const explosions = [];
let layoutEfPos = layoutEf.getBoundingClientRect();

class explosion{
 constructor(x,y){
  this.spriteWidth = 200;
  this.spriteHeight = 179;
  this.width = this.spriteWidth*0.5;
  this.height = this.spriteHeight*0.5;
  this.x = x;
  this.y = y;
  this.image = new Image();
  this.image.src = 'boom.png';
  this.frame = 0;
  this.timer = 0;
  this.angle = Math.random()*6.2;
  this.sound = new Audio();
  this.sound.src = 'testsound.m4a';
 }
 update(){
  if (this.frame === 0) this.sound.play();
  this.timer++;
  if (this.timer%10 === 0){
   this.frame++;
  }
 }
 draw(){
  setup3.save();
  setup3.translate(this.x,this.y);
  setup3.rotate(this.angle);
  setup3.drawImage(this.image,this.spriteWidth * this.frame,0,this.spriteWidth,this.spriteHeight,0 - this.width*0.5,0 - this.height*0.5,this.width,this.height);
  setup3.restore();
 }
}
window.addEventListener('click',function(mod){
 createAnimation(mod);
})
// window.addEventListener('mousemove',function(mod){
//  createAnimation(mod);
// })


function createAnimation(mod){
 let posX = mod.x - layoutEfPos.left - 250;
 let posY = mod.y - layoutEfPos.top + 20;
 explosions.push(new explosion(posX,posY));
}
function animate(){
 setup3.clearRect(0,0,layoutEf.width,layoutEf.height);
 for (let i = 0; i < explosions.length; i++){
  explosions[i].update();
  explosions[i].draw();
  if (explosions[i].frame > 5){
   explosions.splice(i,1);
   i--;
  }
 }
 requestAnimationFrame(animate);
}
animate();