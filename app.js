const express = require('express');
const neo4j = require('neo4j-driver');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Neo4j连接
const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function runQuery(query, params = {}) {
    const session = driver.session();
    try {
        const result = await session.run(query, params);
        return result.records;
    } finally {
        await session.close();
    }
}

// API 路由
app.post('/api/save-route', async (req, res) => {
    const { start, end, distance, duration } = req.body;
    const query = `
        MERGE (s:Location {name: $start})
        MERGE (e:Location {name: $end})
        CREATE (s)-[r:ROUTE_TO {distance: $distance, duration: $duration, timestamp: datetime()}]->(e)
    `;
    try {
        await runQuery(query, { start, end, distance, duration });
        res.json({ message: 'Route saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Welcome to Zhengzhou Traffic System API');
  });

app.get('/api/graph-data', async (req, res) => {
    const query = `
        MATCH (n:Location)-[r:ROUTE_TO]->(m:Location)
        RETURN n.name AS source, m.name AS target, 
               r.distance AS distance, r.duration AS duration
        LIMIT 100
    `;
    try {
        const records = await runQuery(query);
        res.json(records.map(record => record.toObject()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/node-details/:nodeId', async (req, res) => {
    const { nodeId } = req.params;
    const query = `
        MATCH (n:Location {name: $name})-[r:ROUTE_TO]->(m:Location)
        RETURN m.name AS destination, r.distance AS distance, r.duration AS duration
        LIMIT 5
    `;
    try {
        const records = await runQuery(query, { name: nodeId });
        res.json(records.map(record => record.toObject()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});