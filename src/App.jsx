const handleFileUpload = async (event) => {
  const file = event.target.files[0]; // El archivo CSV subido por el usuario
  if (!file) return;

  setIsLoading(true);
  setError(null);

  try {
    // Crear un nuevo archivo ZIP
    const zip = new JSZip();

    // Agregar el archivo CSV al ZIP
    zip.file('data.csv', file);

    // Agregar las imágenes al ZIP
    const images = ['1.png', '2.png', '3.png'];
    for (const imageName of images) {
      const imageResponse = await fetch(`/uploads/Pre-K-4/${imageName}`); // Ruta de las imágenes
      if (!imageResponse.ok) {
        throw new Error(`Error al obtener la imagen ${imageName}`);
      }
      const imageBlob = await imageResponse.blob();
      zip.file(imageName, imageBlob);
    }

    // Generar el archivo ZIP como Blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Convertir el Blob del ZIP a base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Zip = reader.result.split(',')[1]; // Obtener el contenido base64 del ZIP

        // Enviar el ZIP en base64 al servicio Lambda
        const response = await fetch(
          'https://fcz3yiiezk.execute-api.us-east-1.amazonaws.com/Centrum/Test',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorizationToken: 'allow',
            },
            body: JSON.stringify({ zipFile: base64Zip }), // Enviar el archivo ZIP codificado en base64
          }
        );

        if (!response.ok) {
          throw new Error('Error en la respuesta del servidor');
        }

        const data = await response.json();
        const s3Url = data.downloadUrl; // Ahora el backend devuelve la URL de S3

        // Descargar el archivo ZIP desde la URL de S3
        const responseFromS3 = await fetch(s3Url);
        if (!responseFromS3.ok) {
          throw new Error('Error al descargar el archivo ZIP desde S3');
        }

        const zipBlobFromS3 = await responseFromS3.blob();
        saveAs(zipBlobFromS3, 'processed_images.zip');
      } catch (err) {
        console.error('Error:', err);
        setError('Error al procesar el archivo ZIP en el servidor');
      }
    };

    reader.readAsDataURL(zipBlob);
  } catch (err) {
    console.error('Error:', err);
    setError('Error al procesar el archivo CSV y las imágenes');
  } finally {
    setIsLoading(false);
  }
};
