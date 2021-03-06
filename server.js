'use strict';

const pg = require('pg');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const requestProxy = require('express-request-proxy');
const PORT = process.env.PORT;

const app = express();

let conString = process.env.DATABASE_URL;


const client = new pg.Client(conString);
client.connect();
client.on('error', err => console.error(err));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

loadDB();
// posting to server

app.use(express.static('./public'));



app.get('/notes/find', (request, response) => {
  let sql = `SELECT * FROM notes
            INNER JOIN users
            ON notes.user_id=users.user_id
            WHERE ${request.query.field}=$1`

  client.query(sql, [request.query.val])
    .then(result => response.send(result.rows))
    .catch(console.error);
})

app.post('/user', function(request, response) {
  console.log('REQUEST RECEIVED');
  client.query(
    'INSERT INTO users(user_name) VALUES($1) ON CONFLICT DO NOTHING', [request.body.userName],
    function(err) {
      if (err) console.error(err)
      query2();
    }
  )

  function query2() {
    client.query(
      `SELECT user_id FROM users WHERE user_name=$1`, [request.body.userName],
      function(err, result) {
        if (err) console.error(err)
        query3(result.rows[0].user_id)
      }
    )
  }

  function query3(user_id) {
    client.query(
      `INSERT INTO
    notes(user_id,title,category,body)
    VALUES($1,$2,$3,$4);`, [
        user_id,
        request.body.title,
        request.body.category,
        request.body.body
      ],
      function(err) {
        if (err) console.error(err);
        response.send('NEW NOTE ADDED')
      }
    );
  }

});


app.listen(PORT, function() {
  console.log(`'Listening on port: ${PORT}'`);
});

function loadDB() {
  console.log('yes loadDB is running')
  client.query(`
    CREATE TABLE IF NOT EXISTS
    users (
      user_id SERIAL PRIMARY KEY,
      user_name VARCHAR(255) UNIQUE NOT NULL
    );`)
    .catch(console.error);

  client.query(`
    CREATE TABLE IF NOT EXISTS
    notes (
      notes_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id),
      title VARCHAR(255) NOT NULL,
      category VARCHAR(20),
      body TEXT NOT NULL
    );`)
    // .then(loadNotes~x~)
    .catch(console.error);
}
