const imageChoice = new Image()

imageChoice.addEventListener('load', function(){
 const imgMan = document.getElementById('imgManip')
 const setup = imgMan.getContext('2d')
 imgMan.width = 500
 imgMan.height = 706
 const grad1 = setup.createLinearGradient(0, 0, imgMan.width, imgMan.height)
 grad1.addColorStop(0.2, 'red')
 grad1.addColorStop(0.3, 'orange')
 grad1.addColorStop(0.4, 'yellow')
 grad1.addColorStop(0.5, 'green')
 grad1.addColorStop(0.6, 'blue')
 grad1.addColorStop(0.7, 'indigo')
 grad1.addColorStop(0.8, 'violet')
 
 setup.drawImage(imageChoice, 0, 0, imgMan.width, imgMan.height)
 const pixels = setup.getImageData(0, 0, imgMan.width, imgMan.height)
 setup.clearRect(0, 0, imgMan.width, imgMan.height)

 let partList = []
 const partQuant = 5000

 let mappedImg = []
 for (let y = 0; y < imgMan.height; y++){
  let row = []
  for (let x = 0; x < imgMan.width; x++){
   const red = pixels.data[(y*4*pixels.width) + (x*4)]
   const green = pixels.data[(y*4*pixels.width) + (x*4 + 1)]
   const blue = pixels.data[(y*4*pixels.width) + (x*4 + 2)]
   const brightness = calcRelBrightness(red, green, blue)
   const cell = [cellBrightness = brightness, cellColor = 'rgb(' + red + ',' + green + ',' + blue + ')']
   row.push(cell)
  }
  mappedImg.push(row)
 }

 function calcRelBrightness(red, green, blue){
  return (red + green + blue)/305
 }

 class part{
  constructor(){
   this.x = Math.random() * imgMan.width
   this.y = 0
   this.speed = 0
   this.velocity = Math.random() * 0.5
   this.size = Math.random() * 2.5 + 0.2
   this.pos1 = Math.floor(this.y)
   this.pos2 = Math.floor(this.x)
   this.angle = 0
  }
  update(){
   this.pos1 = Math.floor(this.y)
   this.pos2 = Math.floor(this.x)
   if (mappedImg[this.pos1] && mappedImg[this.pos1][this.pos2]){
    this.speed = mappedImg[this.pos1][this.pos2][0]
   }
   let movemnt = (2.5 - this.speed) + this.velocity
   this.angle += this.speed/20
   
   this.y += movemnt + Math.sin(this.angle) * 2
   this.y += movemnt + Math.cos(this.angle) * 2
   this.x += movemnt
   if (this.y >= imgMan.height){
    this.y = 0
    this.x = Math.random() * imgMan.width
   }
   if (this.x >= imgMan.width){
    this.x = 0
    this.y = Math.random() * imgMan.height
   }
  }
  draw(){
   setup.beginPath()
  //  if (mappedImg[this.pos1] && mappedImg[this.pos1][this.pos2]){
  //   setup.fillStyle = mappedImg[this.pos1][this.pos2][1]
  //  }
   setup.fillStyle = grad1
   setup.arc(this.x, this.y, this.size, 0, Math.PI * 2)
   setup.fill()
  }
 }

 function init(){
  for (let i = 0; i < partQuant; i++){
   partList.push(new part)
  }
 }
 init()
 function animate(){
  // setup.drawImage(imageChoice, 0, 0, imgMan.width, imgMan.height)
  setup.globalAlpha = 0.05
  setup.fillStyle = 'rgb(0, 0, 0)'
  setup.fillRect(0, 0, imgMan.width, imgMan.height)
  setup.globalAlpha = 0.2
  for (let i = 0; i < partList.length; i++){
   partList[i].update()
   setup.globalAlpha = partList[i].speed * 0.5
   partList[i].draw()
  }
  requestAnimationFrame(animate)
 }
 animate()

})