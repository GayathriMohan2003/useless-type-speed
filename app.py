from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)

def init_db():
    conn = sqlite3.connect('scores.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            wpm INTEGER,
            accuracy INTEGER
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    data = request.get_json()
    name = data.get('name', 'Anonymous')
    wpm = data.get('wpm', 0)
    accuracy = data.get('accuracy', 0)

    conn = sqlite3.connect('scores.db')
    c = conn.cursor()
    c.execute('INSERT INTO scores (name, wpm, accuracy) VALUES (?, ?, ?)', (name, wpm, accuracy))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Thanks {name}! Your score was saved.'})

@app.route('/leaderboard')
def leaderboard():
    conn = sqlite3.connect('scores.db')
    c = conn.cursor()
    c.execute('SELECT name, wpm, accuracy FROM scores ORDER BY wpm DESC, accuracy DESC LIMIT 10')
    top_scores = c.fetchall()
    conn.close()
    return jsonify(top_scores)

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
