window.addEventListener('load', function(){
 const layout = document.getElementById('geometricDes')
 const setup = layout.getContext('2d')
 layout.width = window.innerWidth
 layout.height = window.innerHeight

 setup.fillStyle = 'green'
 setup.lineCap = 'round'
 setup.shadowColor = 'rgba(0,0,0,0.9)'
 setup.shadowOffsetX = 10
 setup.shadowOffsetY = 5
 setup.shadowBlur = 10

 let size = layout.width < layout.height ? layout.width*0.25 : layout.height*0.25
 let sides = 5
 const maxLevel = 4
 const branches = 2
 let scale = 0.5
 let spread = 0.8
 let color = 'hsl(' + Math.random()*359 + ',100%,50%)'
 let lineWidth = Math.floor(Math.random()*20 + 10)

 const randoBtn = document.getElementById('randoBtn')
 const resetBtn = document.getElementById('resetBtn')
 
 const sliderSpan = document.getElementById('span')
 const sliderSpanInfo = document.querySelector('[for="span"]')
 sliderSpan.addEventListener('change',function(adj){
  spread = adj.target.value
  updateSlider()
  drawFrac()
 })
 const sliderSides = document.getElementById('sides')
 const sliderSidesInfo = document.querySelector('[for="sides"]')
 sliderSides.addEventListener('change',function(adj){
  sides = adj.target.value
  updateSlider()
  drawFrac()
 })
 const sliderThick = document.getElementById('thick')
 const sliderThickInfo = document.querySelector('[for="thick"]')
 sliderThick.addEventListener('change',function(adj){
  lineWidth = adj.target.value
  updateSlider()
  drawFrac()
 })

 function drawBranch(level){
  if (level > maxLevel) return
  setup.beginPath()
  setup.moveTo(0,0)
  setup.lineTo(size,0)
  setup.stroke()
  for (let i = 0; i < branches; i++){
   setup.save()
   setup.translate(size - size/branches*i,0)
   setup.scale(scale,scale)

   setup.save()
   setup.rotate(spread)
   drawBranch(level + 1)
   setup.restore()

   setup.save()
   setup.rotate(-spread)
   drawBranch(level + 1)
   setup.restore()

   setup.restore()
  }
 }

 function drawFrac(){
  setup.clearRect(0,0,layout.width,layout.height)
  setup.save()
  setup.lineWidth = lineWidth
  setup.strokeStyle = color
  setup.translate(layout.width/2,layout.height/2)
  for (let i = 0; i < sides; i++){
   setup.rotate(Math.PI*2/sides)
   drawBranch(0)
  }
  setup.restore()
  randoBtn.style.backgroundColor = color
 }
 drawFrac()

 function randFrac(){
  sides = Math.floor(Math.random()*7 + 2)
  scale = Math.random()*0.2 + 0.4
  spread = Math.random()*2.9 + 0.1
  color = 'hsl(' + Math.random()*359 + ',100%,50%)'
  lineWidth = Math.floor(Math.random()*20 + 10)
 }
 randoBtn.addEventListener('click',function(){
  randFrac()
  updateSlider()
  drawFrac()
 })

 function resetFrac(){
  sides = 5
  scale = 0.5
  spread = 0.8
  color = 'rgb(212,175,55)'
  lineWidth = 20
  randoBtn.style.backgroundColor = color
 }

 resetBtn.addEventListener('click',function(){
  resetFrac()
  updateSlider()
  drawFrac()
 })

 function updateSlider(){
  sliderSpan.value = spread
  sliderSpanInfo.innerText = 'Span: ' + Number(spread).toFixed(2)
  sliderSides.value = sides
  sliderSidesInfo.innerText = 'Sides: ' + sides
  sliderThick.value = lineWidth
  sliderThickInfo.innerText = 'Width: ' + lineWidth
 }
 updateSlider()

 window.addEventListener('resize',function(){
  layout.width = window.innerWidth
  layout.height = window.innerHeight
  size = layout.width < layout.height ? layout.width*0.25 : layout.height*0.25
  setup.shadowColor = 'rgba(0,0,0,0.9)'
  setup.shadowOffsetX = 10
  setup.shadowOffsetY = 5
  setup.shadowBlur = 10
  drawFrac()
 })


})