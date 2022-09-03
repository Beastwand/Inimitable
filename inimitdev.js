let navStatus = 0
function openPane(){
 if (navStatus == 0){
  document.getElementById('thirdSW').style.width = '150px'
  navStatus = 1
 }else{
   closePane()
  }
}
function closePane(){
 document.getElementById('thirdSW').style.width = '0'
 navStatus = 0
}

const layout = document.getElementById('partField');
const setup = layout.getContext('2d');
layout.width = window.innerWidth;
layout.height = 200;

let partCont;

let cursor = {
 x: null,
 y: null,
 radius: 84
}

layout.addEventListener('mousemove',function(cursorMove){
 cursor.x = cursorMove.offsetX;
 cursor.y = cursorMove.offsetY;
 layout.x = cursor.x;
 layout.y = cursor.y;
})
class particle{
 constructor(x,y,directionX,directionY,size,color){
  this.x = x;
  this.y = y;
  this.directionX = directionX;
  this.directionY = directionY;
  this.size = size;
  this.color = color;
 }
 draw(){
  setup.beginPath();
  setup.arc(this.x,this.y,this.size,0,Math.PI*2,false);
  setup.fillStyle = '#000000';
  setup.fill();
 }
 update(){
  if (this.x > layout.width || this.x < 0){
   this.directionX = -this.directionX;
  }
  if (this.y > layout.height || this.y < 0){
   this.directionY = -this.directionY;
  }
  let dx = cursor.x - this.x;
  let dy = cursor.y - this.y;
  let distance = Math.sqrt(dx*dx + dy*dy);
  if (distance < cursor.radius + this.size){
   if (cursor.x < this.x && this.x < layout.width - this.size*10){
    this.x += 10;
   }
   if (cursor.x > this.x && this.x > this.size*10){
    this.x -= 10;
   }
   if (cursor.y < this.y && this.y < layout.height - this.size*10){
    this.y += 10;
   }
   if (cursor.y > this.y && this.y > this.size*10){
    this.y -= 10;
   }
  }
  this.x += this.directionX;
  this.y += this.directionY;
  this.draw();
 }
}
function init(){
 partCont = [];
 let numPart = (layout.height*layout.width)/630;
 for (let i=0; i<numPart; i++){
  let size = 2*Math.random() + 0.5;
  let x = (innerWidth - size*2)*Math.random();
  let y = (innerHeight - size*2)*Math.random();
  let directionX = 2*Math.random() - 1;
  let directionY = 2*Math.random() - 1;
  let color = '#000000';
  partCont.push(new particle(x,y,directionX,directionY,size,color));
 }
}

function connect(){
 let opacity = 1;
 for (let i=0; i<partCont.length; i++){
  for (let j=i; j<partCont.length;j++){
   let distance = ((partCont[i].x - partCont[j].x)*(partCont[i].x - partCont[j].x)) + ((partCont[i].y - partCont[j].y)*(partCont[i].y - partCont[j].y));
   if (distance < (layout.width/9)*(layout.height/9)) {
    opacity = 1 - (distance/20000);
    setup.strokeStyle = 'rgba(0,0,0,' + opacity + ')';
    setup.lineWidth = 0.68;
    setup.beginPath();
    setup.moveTo(partCont[i].x,partCont[i].y);
    setup.lineTo(partCont[j].x,partCont[j].y);
    setup.stroke();
   }
  }
 }
}

function animate(){
 requestAnimationFrame(animate);
 setup.clearRect(0,0,innerWidth,innerHeight);
 for (let i=0; i<partCont.length; i++){
  partCont[i].update();
 }
 connect();
}
window.addEventListener('resize',function(){
 layout.width = innerWidth;
 cursor.radius = 84;
 init();
})
layout.addEventListener('mouseout',function(){
 cursor.x = undefined;
 cursor.y = undefined;
})

init();
animate();