
import React, { useState } from 'react';
import Card from './common/Card';
import { UserPlusIcon } from './common/Icons';

interface AddUpcomingFightFormProps {
    onAddFight: (redParticipant: string, whiteParticipant: string) => Promise<string | null>;
}

const AddUpcomingFightForm: React.FC<AddUpcomingFightFormProps> = ({ onAddFight }) => {
    const [red, setRed] = useState('');
    const [white, setWhite] = useState('');
    const [error, setError] = useState<string|null>(null);
    const [success, setSuccess] = useState<string|null>(null);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        const result = await onAddFight(red, white);
        if(result) {
            setError(result);
        } else {
            setSuccess(`Successfully added fight: ${red} vs ${white}`);
            setRed('');
            setWhite('');
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    return (
        <Card>
            <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
                <UserPlusIcon className="w-6 h-6 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-200">Add Upcoming Fight</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                {success && <p className="text-green-500 text-sm text-center">{success}</p>}
                <input type="text" value={red} onChange={e => setRed(e.target.value)} placeholder="Red Participant Name" required className="w-full bg-zinc-700 text-white p-2 rounded"/>
                <input type="text" value={white} onChange={e => setWhite(e.target.value)} placeholder="White Participant Name" required className="w-full bg-zinc-700 text-white p-2 rounded"/>
                <button type="submit" className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded">
                    Add Fight
                </button>
            </form>
        </Card>
    );
}

export default AddUpcomingFightForm;