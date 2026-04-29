'use client'

import { useState } from 'react'

const containerStyle = {
    maxWidth: 600,
    margin: '40px auto',
    padding: 24,
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
}

const inputStyle = {
    width: '100%',
    padding: 10,
    marginTop: 8,
    marginBottom: 16,
    border: '1px solid #ccc',
    borderRadius: 6,
    color: 'black'
}

const buttonStyle = {
    width: '100%',
    padding: 12,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer'
}

export default function CreateSurvey() {
    const [title, setTitle] = useState('')
    const [reward, setReward] = useState(0)
    const [total, setTotal] = useState(0)

    const totalBudget = reward * total

    const handleSubmit = async () => {
        if (!title || reward <= 0 || total <= 0) {
            alert('Isi semua field dengan benar')
            return
        }

        alert('Submit ke API di sini')
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-gray-500 text-base">Create Survey</h2>

                <label className="text-gray-500 text-base">Judul Survey</label>
                <input
                    style={inputStyle}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <label className="text-gray-500 text-base">Reward per Response</label>
                <input
                    type="number"
                    style={inputStyle}
                    value={reward}
                    onChange={(e) => setReward(Number(e.target.value))}
                />

                <label className="text-gray-500 text-base">Total Responses</label>
                <input
                    type="number"
                    style={inputStyle}
                    value={total}
                    onChange={(e) => setTotal(Number(e.target.value))}
                />

                <p className="text-gray-500 text-base"><b>Total Budget: Rp {totalBudget}</b></p>

                <button style={buttonStyle} onClick={handleSubmit}>
                    Create Survey
                </button>
            </div>
        </div>
    )
}