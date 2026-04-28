'use client'

import { useState } from 'react'

export default function CreateSurveyPage() {
    const [title, setTitle] = useState('')
    const [reward, setReward] = useState(0)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {

        if (!title || reward <= 0 || total <= 0) {
            alert('Isi semua field dengan benar')
            return
        }

        setLoading(true)

        try {
            const res = await fetch('/api/survey/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creator_id: '5f8684c9-32c6-4e2c-85de-ec677afd916f', // 🔥 Sementara hardcode
                    title: title,
                    reward_per_response: reward,
                    total_responses: total
                })
            })

            const data = await res.json()

            if (!res.ok) {
                alert(data.error)
                return
            }

            alert('Survey berhasil dibuat! 🎉')
            console.log('Survey ID:', data.survey_id)

            // reset form
            setTitle('')
            setReward(0)
            setTotal(0)

        } catch (err) {
            console.error(err)
            alert('Terjadi error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: 24 }}>
            <h1>Create Survey</h1>

            <div style={{ marginTop: 16 }}>
                <input
                    type="text"
                    placeholder="Judul Survey"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            <div style={{ marginTop: 16 }}>
                <input
                    type="number"
                    placeholder="Reward per response"
                    value={reward}
                    onChange={(e) => setReward(Number(e.target.value))}
                />
            </div>

            <div style={{ marginTop: 16 }}>
                <input
                    type="number"
                    placeholder="Total responden"
                    value={total}
                    onChange={(e) => setTotal(Number(e.target.value))}
                />
            </div>

            <p>
                Total Budget: <strong>Rp {reward * total}</strong>
            </p>

            <div style={{ marginTop: 24 }}>
                <button onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Survey'}
                </button>
            </div>
        </div>
    )
}