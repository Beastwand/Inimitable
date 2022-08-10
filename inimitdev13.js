const layoutE = document.getElementById('enemyMvmt4');
const setup2 = layoutE.getContext('2d');
layoutEWidth = layoutE.width = 500;
layoutEHeight = layoutE.height = 1000;
const numEnemies = 18;
const enemiesList = [];

let gameFrame = 0;

class enemy{
 constructor(){
  this.image = new Image();
  this.image.src = 'enemy4.png';
  this.speed = Math.random()*4 - 1;
  this.spriteWidth = 213;
  this.spriteHeight = 212;
  this.width = this.spriteWidth/2.5;
  this.height = this.spriteHeight/2.5;
  this.x = Math.random()*(layoutE.width - this.width);
  this.y = Math.random()*(layoutE.height - this.height);
  this.newX = Math.random()*layoutE.width;
  this.newY = Math.random()*layoutE.height;
  this.frame = 0;
  this.flapSpeed = Math.floor(Math.random()*3 + 1);
  this.interval = 50 + Math.floor(Math.random()*200);
 }
 update(){
  if (gameFrame%this.interval === 0){
   this.newX = Math.random()*(layoutE.width - this.width);
   this.newY = Math.random()*(layoutE.height - this.height);
  }
  let disX = this.x - this.newX;
  let disY = this.y - this.newY;
  this.x -= disX/66;
  this.y -= disY/66;
  if (this.x + this.width < 0) this.x = layoutE.width;
  if (gameFrame%this.flapSpeed === 0){
   this.frame > 4 ? this.frame = 0 : this.frame++;
  }
 }
 draw(){
  setup2.drawImage(this.image,this.frame*this.spriteWidth,0,this.spriteWidth,this.spriteHeight,this.x,this.y,this.width,this.height);
 }
}
for (let i = 0; i < numEnemies; i++){
 enemiesList.push(new enemy());
}

function animate(){
 setup2.clearRect(0,0,layoutEWidth,layoutEHeight);
 enemiesList.forEach(enemy => {
  enemy.update();
  enemy.draw();
 })
 gameFrame++;
 requestAnimationFrame(animate);
}
animate();