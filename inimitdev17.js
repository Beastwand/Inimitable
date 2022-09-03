var randCSS = Math.floor(Math.random()*256)
var randCSS2 = Math.floor(Math.random()*256)
var randCSS3 = Math.floor(Math.random()*256)

// document.querySelectorAll("body").forEach(item => item.style.backgroundColor = "orange")

const setup = document.getElementById('ctrail')
const ctact = setup.getContext('2d')
setup.width = window.innerWidth
setup.height = window.innerHeight
const partStruct = []
let hue = 0

window.addEventListener('resize', function() {
 setup.width = window.innerWidth
 setup.height = window.innerHeight
})

const cursor = {
 x: undefined,
 y: undefined
}

setup.addEventListener('click', function(lineup) {
 cursor.x = lineup.x
 cursor.y = lineup.y
 for (let i = 0; i < 15; i++) {partStruct.push(new ctpart())}
})

setup.addEventListener('mousemove', function(lineup2) {
 cursor.x = lineup2.x
 cursor.y = lineup2.y
 for (let i = 0; i < 3; i++) {partStruct.push(new ctpart())}
})

class ctpart {
 constructor() {
  this.x = cursor.x
  this.y = cursor.y
  // this.x = Math.random() * setup.width
  // this.y = Math.random() * setup.height
  this.size = Math.random() * 7 + 1
  this.rateX = Math.random() * 3.5 - 1.75
  this.rateY = Math.random() * 3.5 - 1.75
  this.color = 'hsl(' + Math.random()*hue + ', 100%, 50%)'
 }
 refresh() {
  this.x += this.rateX
  this.y += this.rateY
  if (this.size > 0.8) this.size -= 0.02
 }
 setEffect(){
  ctact.fillStyle = this.color
  ctact.beginPath()
  ctact.arc(this.x, this.y, this.size, 0, Math.PI * 2)
  ctact.fill()
 }
}

function handlePart() {
 for (let i = 0; i < partStruct.length; i++) {
  partStruct[i].refresh()
  partStruct[i].setEffect()
  for (let j = i; j < partStruct.length; j++) {
   const lx = partStruct[i].x - partStruct[j].x
   const ly = partStruct[i].y - partStruct[j].y
   const len = Math.sqrt(lx*lx + ly*ly)
   if (len < 108) {
     ctact.beginPath()
     ctact.strokeStyle = partStruct[i].color
     ctact.lineWidth = partStruct[i].size/5
     ctact.moveTo(partStruct[i].x, partStruct[i].y)
     ctact.lineTo(partStruct[j].x, partStruct[j].y)
     ctact.stroke()
     ctact.closePath()
   }
  }
  if (partStruct[i].size < 0.81){
   partStruct.splice(i, 1)
  //  i--
  }
 }
}

function motact() {
//  ctact.fillStyle = 'rgba(0, 0, 0, 0.02)'
 ctact.clearRect(0, 0, setup.width, setup.height)
 handlePart()
 hue+=1.1
 requestAnimationFrame(motact)
}
motact()