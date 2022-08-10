document.addEventListener('DOMContentLoaded',function(){
 const layoutNE = document.getElementById('SSGnewEnemy');
 const setup4 = layoutNE.getContext('2d');
 layoutNE.width = 500;
 layoutNE.height = 800;

 class Game{
  constructor(setup4,width,height){
   this.setup4 = setup4;
   this.width = width;
   this.height = height;
   this.enemies = [];
   this.enemyInterval = 300;
   this.enemyTimer = 0;
   this.enemyTypes = ['worm','ghost'];
   console.log(this.enemies);
  }
  update(keepTime){
   this.enemies = this.enemies.filter(object => !object.markedForErase);
   if (this.enemyTimer > this.enemyInterval){
    this.#addNewEnemy();
    this.enemyTimer = 0;
   }else{
    this.enemyTimer += keepTime;
   }
   this.enemies.forEach(object => object.update(keepTime));
  }
  draw(){
   this.enemies.forEach(object => object.draw(this.setup4));
  }
  #addNewEnemy(){
   const randEnemy = this.enemyTypes[Math.floor(this.enemyTypes.length*Math.random())];
   if (randEnemy == 'worm') this.enemies.push(new Worm(this));
   else if (randEnemy == 'ghost') this.enemies.push(new Ghost(this));
   this.enemies.push(new Worm(this));
  //  this.enemies.sort(function(hb,lf){
  //   return hb.y - lf.y;
  //  })
  }
 }

 class Enemy{
  constructor(game){
   this.game = game;
  //  console.log(this.game);
   this.markedForErase = false;
  }
  update(keepTime){
   this.x -= this.velX*keepTime;
   if (this.x < 0 - this.width) this.markedForErase = true;
  }
  draw(setup4){
   setup4.drawImage(this.image,0,0,this.spriteWidth,this.spriteHeight,this.x,this.y,this.width,this.height);
  }
 }

 class Worm extends Enemy{
  constructor(game){
   super(game);
   this.spriteWidth = 229;
   this.spriteHeight = 171;
   this.width = this.spriteWidth*0.5;
   this.height = this.spriteHeight*0.5;
   this.image = worm;
   this.x = this.game.width;
   this.y = this.game.height - this.height;
   this.velX = 0.1 + 0.2*Math.random();
  }
 }
 class Ghost extends Enemy{
  constructor(game){
   super(game);
   this.spriteWidth = 261;
   this.spriteHeight = 209;
   this.width = this.spriteWidth*0.5;
   this.height = this.spriteHeight*0.5;
   this.image = ghost;
   this.x = this.game.width;
   this.y = this.game.height*0.6*Math.random();
   this.velX = 0.1 + 0.35*Math.random();
  }
  draw(){
   super.draw(setup4);
  }
 }

 const game = new Game(setup4,layoutNE.width,layoutNE.height);
 let previousTime = 1;
 function animate(timeRec){
  setup4.clearRect(0,0,layoutNE.width,layoutNE.height);
  const keepTime = timeRec - previousTime;
  previousTime = timeRec;
  game.update(keepTime);
  game.draw();
  requestAnimationFrame(animate);
 }
 animate(0);
})