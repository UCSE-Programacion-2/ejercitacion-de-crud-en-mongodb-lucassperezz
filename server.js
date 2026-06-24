const express = require('express');
const { ObjectId } = require('mongodb');
const { client, connectDB, closeDB } = require('./src/mongodb');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Middleware para inyectar la base de datos
app.use((req, res, next) => {
    req.db = client.db('MundialDB');
    req.collection = req.db.collection('equipos');
    next();
});

// GET /equipos
app.get('/equipos', async (req, res) => {
    const equipos = await req.collection.find().toArray();
    return res.status(200).json(equipos);
});

// GET /equipos/buscar - ANTES que /equipos/:id
app.get('/equipos/buscar', async (req, res) => {
    const { tecnico } = req.query;
    const filtro = tecnico ? { tecnico: { $regex: tecnico, $options: 'i' } } : {};
    const equipos = await req.collection.find(filtro).toArray();
    return res.status(200).json(equipos);
});

// GET /equipos/:id
app.get('/equipos/:id', async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    const equipo = await req.collection.findOne({ _id: new ObjectId(id) });
    if (!equipo) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    return res.status(200).json(equipo);
});

// Función de validación de campos
function validarCampos(body) {
    const { equipo, tecnico, continente, campeonatos_mundiales } = body;
    if (!equipo || !tecnico || !continente || campeonatos_mundiales === undefined) {
        return 'Todos los campos son requeridos';
    }
    if (typeof equipo !== 'string' || typeof tecnico !== 'string' || typeof continente !== 'string') {
        return 'equipo, tecnico y continente deben ser strings';
    }
    if (typeof campeonatos_mundiales !== 'number') {
        return 'campeonatos_mundiales debe ser un número';
    }
    return null;
}

// POST /equipos
app.post('/equipos', async (req, res) => {
    const error = validarCampos(req.body);
    if (error) {
        return res.status(400).json({ error });
    }
    const { equipo, tecnico, continente, campeonatos_mundiales } = req.body;
    const nuevoEquipo = { equipo, tecnico, continente, campeonatos_mundiales };
    const resultado = await req.collection.insertOne(nuevoEquipo);
    return res.status(201).json({ _id: resultado.insertedId, ...nuevoEquipo });
});

// PUT /equipos/:id
app.put('/equipos/:id', async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    const error = validarCampos(req.body);
    if (error) {
        return res.status(400).json({ error });
    }
    const { equipo, tecnico, continente, campeonatos_mundiales } = req.body;
    const resultado = await req.collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { equipo, tecnico, continente, campeonatos_mundiales } }
    );
    if (resultado.matchedCount === 0) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    return res.status(200).json({ mensaje: 'Equipo actualizado correctamente' });
});

// DELETE /equipos/:id
app.delete('/equipos/:id', async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    const resultado = await req.collection.deleteOne({ _id: new ObjectId(id) });
    if (resultado.deletedCount === 0) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    return res.status(200).json({ mensaje: 'Equipo eliminado correctamente' });
});

if (require.main === module) {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor escuchando en http://localhost:${PORT}`);
        });
    });
}

module.exports = { app, closeDB, client, connectDB };