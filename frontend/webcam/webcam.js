var mediaDevices = navigator.mediaDevices;

export async function setCameraStream(HTML_Element) {
  mediaDevices.getUserMedia({ video: true }).then((stream) => {
    HTML_Element.srcObject = stream
  })
  return;
}
