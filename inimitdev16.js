const layout = document.getElementById('partNetText');
const setup = layout.getContext('2d');
layout.width = 250;
layout.height = 100;
let partCont = [];
const cursorDet = {radiusC: 20}

window.addEventListener('mousemove',function(uponM){
 cursorDet.x = uponM.x;//+1?
 cursorDet.y = uponM.y;//+3?
});

setup.fillStyle = 'rgb(0,35,102)';
setup.font = '1.2rem franklin gothic medium';
setup.fillText('Inimitable',8,23);
setup.fillText('Development',8,38);
const Cdata = setup.getImageData(0,0,200,200);

class particle {
 constructor(x,y){
  this.x = x;
  this.y = y;
  this.size = 0.5;
  this.baseX = this.x;
  this.baseY = this.y;
  this.weight = 7*Math.random() + 1;
 }
 draw(){
  setup.fillStyle = 'rgb(0,35,102)';
  setup.beginPath();
  setup.arc(this.x,this.y,this.size,0,Math.PI*2);
  setup.closePath();
  setup.fill();
 }
 update(){
  let dx = cursorDet.x - this.x;
  let dy = cursorDet.y - this.y;
  let distance = Math.sqrt(dx*dx + dy*dy);
  let forceDirecX = dx/distance;
  let forceDirecY = dy/distance;
  let maxDist = cursorDet.radiusC;
  let force = (maxDist - distance)/maxDist;
  let direcX = forceDirecX*force*this.weight;
  let direcY = forceDirecY*force*this.weight;

  if (distance < cursorDet.radiusC){
   this.x -= direcX;
   this.y -= direcY;
  }else{
    if (this.x !== this.baseX){
     let dx = this.x - this.baseX;
     this.x -= dx/24;
    }
    if (this.y !== this.baseY){
     let dy = this.y - this.baseY;
     this.y -= dy/24;
    }
  }
 }
}

function init(){
 partCont = [];
 for (let y=0,y2=Cdata.height; y<y2;y++){
  for (let x=0,x2=Cdata.width; x<x2; x++){
   if (Cdata.data[y*4*Cdata.width + x*4 +3]>128){
    let posX = x;
    let posY = y;
    partCont.push(new particle(posX*2,posY*2));
   }
  }
 }
}
init();

function animate(){
 setup.clearRect(0,0,layout.width,layout.height);
 for (let i=0; i<partCont.length; i++){
  partCont[i].draw();
  partCont[i].update();
 }
 connect();
 requestAnimationFrame(animate);
}
animate();

function connect(){
 for (let i=0; i<partCont.length; i++){
  for (let j=i; j<partCont.length; j++){
   let dx = partCont[i].x - partCont[j].x;
   let dy = partCont[i].y - partCont[j].y;
   let distance = Math.sqrt(dx*dx + dy*dy);

   if (distance < 3.5){
    setup.strokeStyle = 'rgb(0,35,102)';
    setup.lineWidth = 1.1;
    setup.beginPath();
    setup.moveTo(partCont[i].x,partCont[i].y);
    setup.lineTo(partCont[j].x,partCont[j].y);
    setup.stroke();
   }
  }
 }
}