const tstream = document.getElementById('tstream')
const tseffect = tstream.getContext('2d')
tstream.width = window.innerWidth
tstream.height = window.innerHeight

let colorScheme = tseffect.createRadialGradient(tstream.width/2, tstream.height/2, 180, tstream.width/2, tstream.height/2, 612)
colorScheme.addColorStop(0, 'rgb(255, 215, 0)')
colorScheme.addColorStop(0.5, 'rgb(0, 255, 0)')
colorScheme.addColorStop(1, 'rgb(21, 96, 189)')
// colorScheme.addColorStop(0, 'rgb(' + Math.random()*255 + ',' + Math.random()*255 + ',' + Math.random()*255)

class symbols {
 constructor(x, y, textSize, tstreamHeight) {
  this.chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  this.x = x
  this.y = y
  this.textSize = textSize
  this.text = ''
  this.tstreamHeight = tstreamHeight
 }
 draw(instanceScope){
  this.text = this.chars.charAt(Math.floor(Math.random()*this.chars.length))
  instanceScope.fillText(this.text, this.x*this.textSize, this.y*this.textSize)
  if (this.y*this.textSize > this.tstreamHeight && Math.random() > 0.98){
   this.y = 0}
   else {this.y += 1}
 }
}
class effect {
 constructor(tstreamWidth, tstreamHeight){
  this.tstreamWidth = tstreamWidth
  this.tstreamHeight = tstreamHeight
  this.textSize = 20
  this.columns = this.tstreamWidth/this.textSize
  this.symbolChars = []
  this.#activate()
 }
 #activate() {
  for (let i = 0; i < this.columns; i++){
   this.symbolChars[i] = new symbols(i, 0, this.textSize, this.tstreamHeight)
  }
 }
 adjustDim(width, height){
  this.tstreamWidth = width
  this.tstreamHeight = height
  this.columns = this.tstreamWidth/this.textSize
  this.symbolChars = []
  this.#activate()
 }
}

const effectEx = new effect(tstream.width, tstream.height)
let lastTime = 0
const fps = 80
const nextFrame = 1000/fps
let timer = 0

function motion(timeRec){
 const deltaTime = timeRec - lastTime
 lastTime = timeRec
 if (timer > nextFrame){
  tseffect.fillStyle = 'rgba(0, 0, 0, 0.05)'
  tseffect.textAlign = 'center'
  tseffect.fillRect(0, 0, tstream.width, tstream.height)
  tseffect.fillStyle = colorScheme
  tseffect.font = effectEx.textSize + 'px monospace'
  effectEx.symbolChars.forEach(symbolChar => symbolChar.draw(tseffect))
  timer = 0}
  else {timer += deltaTime}
 requestAnimationFrame(motion)
 
}
motion(0)

window.addEventListener('resize', function(){
 tstream.width = window.innerWidth
 tstream.height = window.innerHeight
 effectEx.adjustDim(tstream.width, tstream.height)
 colorScheme = tseffect.createRadialGradient(tstream.width/2, tstream.height/2, 180, tstream.width/2, tstream.height/2, 718)
 colorScheme.addColorStop(0, 'rgb(255, 215, 0)')
 colorScheme.addColorStop(0.5, 'rgb(0, 255, 0)')
 colorScheme.addColorStop(1, 'rgb(21, 96, 189)')})