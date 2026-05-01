import { Question } from '@/types/survey.types';

interface QuestionItemProps {
    question: Question;
    index: number;
}

export default function QuestionItem({ question: q, index }: QuestionItemProps) {
    return (
        <div className="p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">
                    {index + 1}. {q.question_text}
                </h3>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full shrink-0 ml-2">
                    {q.question_type === 'text' ? 'Teks Pendek' : q.question_type === 'radio' ? 'Pilihan Ganda' : 'Kotak Centang'}
                </span>
            </div>
            
            {q.options && q.options.length > 0 && (
                <ul className="mt-2 space-y-1 pl-4">
                    {q.options.map((opt) => (
                        <li key={opt.id} className="text-sm text-gray-600 flex items-center gap-2">
                            <span className="text-gray-400 text-xs">
                                {q.question_type === 'radio' ? '○' : '□'}
                            </span>
                            {opt.option_text}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
