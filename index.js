const express = require('express')
const dotenv = require('dotenv')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')

dotenv.config()
const app = express()
app.use(express.json())

const genAI = new GoogleGenerativeAI(process.env.api_key)
const model = genAI.getGenerativeModel({model: "models/gemini-1.5-flash"})
const upload = multer({ dest: 'uploads/' })

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

app.post('/generate-text', async (req, res) => {
    const { prompt } = req.body
    try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        res.json({ output: response.text() })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Endpoint to handle image uploads
const imageGeneratePart = (imagePath) => ({
    inlineData: {
        data: fs.readFileSync(imagePath).toString('base64'),
        mimeType: 'image/jpeg' // Adjust based on your image type
    }
})

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || "Describe the image"
    const image = imageGeneratePart(req.file.path)
    try {
        const result = await model.generateContent([prompt, image])
        const response = await result.response
        res.json({ output: response.text() })
    } catch (error) {
        res.status(500).json({ error: error.message })
    } finally {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting file:', err)
        })
    }
})

// Endpoint to handle document uploads
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const filePath = req.file.path
    const buffer = fs.readFileSync(filePath)
    const base64data = buffer.toString('base64')
    const mimeType = req.file.mimetype

    try {
        const documentPart = {
            inlineData: {
                data: base64data,
                mimeType: mimeType
            }
        }
        const result = await model.generateContent(['Analyze this document: ', documentPart])
        const response = await result.response
        res.json({ output: response.text() })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }     finally {
        fs.unlinkSync(filePath, (err) => {
            if (err) console.error('Error deleting file:', err)
        })
    }
})

// Endpoint to handle audio uploads
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const audioBuffer = fs.readFileSync(req.file.path)
    const audioBase64 = audioBuffer.toString('base64')
    const audioPart = {
        inlineData: {
            data: audioBase64,
            mimeType: req.file.mimetype
        }
    }  
    try {
        const result = await model.generateContent(['Transcribe or analyze the following audio: ', audioPart])
        const response = await result.response
        res.json({ output: response.text() })
    } catch (error) {
        res.status(500).json({ error: error.message })
    } finally {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting file:', err)
        })
    }
})

