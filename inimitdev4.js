const imgUpload = document.querySelector('#imgUpload')
var imgUploaded = ''

imgUpload.addEventListener('change', function(){
 const inputImg = new FileReader()
 inputImg.addEventListener('load', () => {
  imgUploaded = inputImg.result
  document.querySelector('#exampleShown').style.backgroundImage = `url(${imgUploaded})`
 })
 inputImg.readAsDataURL(this.files[0])
})