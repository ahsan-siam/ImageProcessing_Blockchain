const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Web3 = require('web3');
const cors = require('cors');
const app = express();
const os = require('os');
const PORT = process.env.PORT || 3000;
app.use(cors());
// Serve static files, including your `home.html`
app.use(express.static(path.join(__dirname, 'public')));

// Upload folder setup
const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadFolder),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Web3 and contract setup
const web3 = new Web3('http://127.0.0.1:8545');
// Contract ABI and address configuration (same as before)
const contractABI =[
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "imageId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "chunkIndex",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "chunkData",
				"type": "string"
			}
		],
		"name": "ChunkStored",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "createNewImage",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "imageId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "fullData",
				"type": "string"
			}
		],
		"name": "ImageReconstructed",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "imageId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "chunkIndex",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "chunkData",
				"type": "string"
			}
		],
		"name": "storeChunk",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "imageId",
				"type": "uint256"
			}
		],
		"name": "getChunks",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "index",
						"type": "uint256"
					},
					{
						"internalType": "string",
						"name": "data",
						"type": "string"
					}
				],
				"internalType": "struct EncodedImageStorage.Chunk[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "nextImageId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "imageId",
				"type": "uint256"
			}
		],
		"name": "reconstructImage",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];
const contractAddress = '0x25294BD98c69157F21B9052e524358E09B1d55e8';
const contract = new web3.eth.Contract(contractABI, contractAddress);
let c=0;
// Route for uploading images
app.post('/upload', upload.single('image'), async (req, res) => {
    c=c+1;
    console.log(c+" User Connected" );
    const startTime2 = performance.now();
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {


        const base64EncodedImage = encodeImageToBase64(req.file.path);




        const chunkSize = 500; // Adjust based on your needs
        const numChunks = Math.ceil(base64EncodedImage.length / chunkSize);

        const accounts = await web3.eth.getAccounts();
        const from = accounts[0];

        // Allocate a new image ID on the blockchain
        const imageId = await contract.methods.createNewImage().call({ from });

        for (let i = 0; i < numChunks; i++) {
            const chunk = base64EncodedImage.slice(i * chunkSize, (i + 1) * chunkSize);
            
            console.log(` Chunk ${i + 1}`);
            await contract.methods.storeChunk(imageId, i, chunk).send({ from, gas: 500000 });
        }
        const endTime2 = performance.now();
    const executionTime2 = endTime2 - startTime2;
    console.log(' Insertion Time:'+executionTime2+'ms');
    
        res.json({ message: 'Image uploaded and stored in chunks!', imageId });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to store image in blockchain.' });
    }
});
let i=0;
// Route for reconstructing images

/*
//================== FOR BASE64 PROCESSING ====================// 

app.get('/reconstruct/:imageId', async (req, res) => {
    const startTime2 = performance.now();
    const { imageId } = req.params;
    i=i+1;
    console.log('REQUEST '+i);

    try {
       
        // Parse imageId to ensure it's a valid number
        const parsedImageId = parseInt(imageId, 10);
        if (isNaN(parsedImageId)) {
            return res.status(400).json({ error: 'Invalid imageId parameter. Must be a number.' });
        }

        // Fetch chunks from the contract
        const chunks = await contract.methods.getChunks(parsedImageId).call();

        // Check if chunks array is valid
        if (!chunks || chunks.length === 0) {
            return res.status(404).json({ error: 'No chunks found for the given imageId.' });
        }

        // Create a mutable copy of the chunks array and sort it
        const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);

        // Reconstruct the image data
        const reconstructedData = sortedChunks.map(chunk => chunk.data).join('');

        // Debugging: Log reconstructedData

        const endTime2 = performance.now();
    const executionTime2 = endTime2 - startTime2;
    console.log(' Response Time:'+executionTime2+'ms');
    const memoryUsage = process.memoryUsage();
    console.log(memoryUsage);
     //  console.log('Reconstructed Base64 data:', reconstructedData);

        // Validate reconstructedData
        if (!reconstructedData || reconstructedData.trim() === '') {
            return res.status(500).json({ error: 'Reconstructed data is empty or invalid.' });
        }

        // Add the MIME type to the Base64 data (assume PNG, change if necessary)
        const base64Image = `data:image/png;base64,${reconstructedData}`;

        // Send the reconstructed image data
        res.json({ message: 'Image reconstructed successfully!',rt:executionTime2,req_no: i, reconstructedData: base64Image });
    } catch (error) {
        console.error('Error reconstructing image:', error);
        res.status(500).json({ error: 'Failed to reconstruct image.' });
    }
});









*/








/*



// ====================== FOR HEXA DECIMAL PROCESSING =====================

app.get('/reconstruct/:imageId', async (req, res) => {
    const startTime2 = performance.now();
    const { imageId } = req.params;

    try {
        // Parse imageId to ensure it's a valid number
        const parsedImageId = parseInt(imageId, 10);
        if (isNaN(parsedImageId)) {
            return res.status(400).json({ error: 'Invalid imageId parameter. Must be a number.' });
        }

        // Fetch chunks from the contract
        const chunks = await contract.methods.getChunks(parsedImageId).call();

        // Check if chunks array is valid
        if (!chunks || chunks.length === 0) {
            return res.status(404).json({ error: 'No chunks found for the given imageId.' });
        }

        // Create a mutable copy of the chunks array and sort it
        const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);

        // Reconstruct the image data
        const reconstructedData = sortedChunks.map(chunk => chunk.data).join('');

        // Debugging: Log reconstructedData
       

        // Convert the reconstructed data from hex to a string
        const hexDecodedString = Buffer.from(reconstructedData, 'hex').toString('utf8');
        const endTime2 = performance.now();
        const executionTime2 = endTime2 - startTime2;
        console.log(' Response Time:' + executionTime2 + 'ms');
        const memoryUsage = process.memoryUsage();
    console.log(memoryUsage);
      //  console.log('Reconstructed Base64 data:', reconstructedData);
        // Validate the hexDecodedString
        if (!hexDecodedString || hexDecodedString.trim() === '') {
            return res.status(500).json({ error: 'Decoded data is empty or invalid.' });
        }

        // Send the decoded string
        res.json({ message: 'Image reconstructed successfully!', reconstructedData: reconstructedData });
    } catch (error) {
        console.error('Error reconstructing image:', error);
        res.status(500).json({ error: 'Failed to reconstruct image.' });
    }
});









*/









//==================== URLComponent ENCODING ==================


app.get('/reconstruct/:imageId', async (req, res) => {
    const startTime2 = performance.now();
    const { imageId } = req.params;

    try {
        // Parse imageId to ensure it's a valid number
        const parsedImageId = parseInt(imageId, 10);
        if (isNaN(parsedImageId)) {
            return res.status(400).json({ error: 'Invalid imageId parameter. Must be a number.' });
        }

        // Fetch chunks from the contract
        const chunks = await contract.methods.getChunks(parsedImageId).call();

        // Check if chunks array is valid
        if (!chunks || chunks.length === 0) {
            return res.status(404).json({ error: 'No chunks found for the given imageId.' });
        }

        // Sort chunks by index and reconstruct the URL-encoded data
        const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);
        const reconstructedDataUrlEncoded = sortedChunks.map(chunk => chunk.data).join('');

        // Decode the URL-encoded data
        const decodedData = decodeURIComponent(reconstructedDataUrlEncoded);
		//	console.log(decodedData);
        // Encode the binary data to Base64
        const base64EncodedImage = Buffer.from(decodedData, 'binary').toString('base64');

        const endTime2 = performance.now();
        const executionTime2 = endTime2 - startTime2;
        console.log('Retrieval Time:', executionTime2 + 'ms');
const memoryUsage = process.memoryUsage();
    console.log(memoryUsage);
        // Return the Base64-encoded image
        res.json({
            message: 'Image reconstructed successfully!',
            reconstructedData: decodedData,
        });
    } catch (error) {
        console.error('Error reconstructing image:', error);
        res.status(500).json({ error: 'Failed to reconstruct image.' });
    }
});



























// Helper to encode image to Base64
function encodeImageToBase64(imagePath) {
    const startTime2= performance.now();
    


    const image = fs.readFileSync(imagePath);
   // console.log(image.toString('base64'));

   const endTime2 = performance.now();
    const executionTime2 = endTime2 - startTime2;
    console.log(' Base 64 Encoding Time:'+executionTime2+'ms');
    return image.toString('base64');
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,  'upload.html'));
});

app.get('/decode', (req, res) => {
    res.sendFile(path.join(__dirname, 'decode.html'));
    console.log("CONNECTED");
});


app.get('/decode_hexa', (req, res) => {
    res.sendFile(path.join(__dirname, 'decode_hex.html'));
});
app.get('/decode_url', (req, res) => {
    res.sendFile(path.join(__dirname, 'decode_url.html'));
});

function encodeImageToHex(imagePath) {
    const startTime2= performance.now();
  
    const image = fs.readFileSync(imagePath);
    const hexString = image.toString('hex');
    const endTime2 = performance.now();
    const executionTime2 = endTime2 - startTime2;
    console.log(' Hexa Encoding Time:'+executionTime2+'ms');
    return hexString;
}

function encodeImageToURL(imagePath) {
    const startTime2 = performance.now();
    
    // Base64 encode the image
    const base64Encoded = encodeImageToBase64(imagePath); // Assuming this function exists

    // URL encode the Base64-encoded string
    const urlEncoded = encodeURIComponent(base64Encoded);

    const endTime2 = performance.now();
    const executionTime2 = endTime2 - startTime2;

    console.log('URL Encoding Time: ' + executionTime2 + 'ms');

	console.log('THIS IS ==> ' + urlEncoded + ' < === FINISH');

    return urlEncoded;
}