'use client'

import { useEffect, useState } from 'react'

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
    borderRadius: 6
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

export default function MySurveys() {
    const [data, setData] = useState<any[]>([])

    useEffect(() => {
        // dummy dulu (nanti connect API)
        setData([
            {
                id: 1,
                title: 'Survey Test',
                total_responses: 10,
                remaining_responses: 4,
                reward_per_response: 1000,
                status: 'active'
            }
        ])
    }, [])

    return (
        <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
            <div style={containerStyle}>
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800"> My Surveys </h2>

                {data.map((s) => {
                    const completed = s.total_responses - s.remaining_responses
                    const progress = (completed / s.total_responses) * 100

                    return (
                        <div
                            key={s.id}
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                padding: 12,
                                marginTop: 16
                            }}
                        >
                            <h3 className="text-gray-500 text-base">{s.title}</h3>

                            <p className="text-gray-500 text-base">Status: {s.status}</p>
                            <p className="text-gray-500 text-base">
                                Progress: {completed} / {s.total_responses}
                            </p>

                            {/* Progress Bar */}
                            <div style={{ background: '#eee', height: 10, borderRadius: 6 }}>
                                <div
                                    style={{
                                        width: `${progress}%`,
                                        background: '#22c55e',
                                        height: '100%',
                                        borderRadius: 6
                                    }}
                                />
                            </div>

                            <p style={{ marginTop: 8 }} className="block font-semibold text-blue-600">
                                Reward: Rp {s.reward_per_response}
                            </p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}