import React, { useState } from 'react';
import { 
  Hash, 
  Volume2, 
  Mic, 
  Headphones, 
  Settings, 
  Plus, 
  Gift, 
  Sticker, 
  Smile, 
  Search,
  Bell,
  Pin,
  Users,
  Inbox,
  HelpCircle,
  ShieldAlert,
  XCircle
} from 'lucide-react';

// --- Sample Data from your upload ---
const CONVERSATION_DATA = [
    {"author": "SuspiciousPerson", "time": "23:30", "text": "Hey there, how are you?"},
    {"author": "TeenUser", "time": "23:32", "text": "Who is this?"},
    {"author": "SuspiciousPerson", "time": "23:33", "text": "Just a friend. You look beautiful in your profile pic."},
    {"author": "TeenUser", "time": "23:34", "text": "Thanks, I guess?"}, 
    {"author": "SuspiciousPerson", "time": "23:35", "text": "I think you're so cute. Wanna chat more?"},
    {"author": "TeenUser", "time": "23:37", "text": "Not sure... I'm kinda busy."},
    {"author": "SuspiciousPerson", "time": "23:40", "text": "Don’t tell anyone we are talking, okay? I don’t want others to know."},
    {"author": "TeenUser", "time": "23:42", "text": "Hmm... okay?"}
];

// --- Discord Utility Components ---

const ServerIcon = ({ active, image, initial }) => (
    <div className="group relative flex items-center justify-center w-[72px] h-[48px] mb-2 cursor-pointer">
        {/* Selection Pill */}
        <div className={`absolute left-0 bg-white w-1 rounded-r-full transition-all duration-200 ${active ? 'h-10' : 'h-2 group-hover:h-5 opacity-0 group-hover:opacity-100'}`} />
        
        {/* Icon */}
        <div className={`w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-white font-bold overflow-hidden ${active ? 'bg-[#5865F2] rounded-[16px]' : 'bg-[#36393f] group-hover:bg-[#5865F2]'}`}>
            {image ? <img src={image} alt="Server" className="w-full h-full object-cover" /> : initial}
        </div>
    </div>
);

const ChannelItem = ({ name, active, type = 'text' }) => (
    <div className={`flex items-center px-2 py-[6px] mx-2 rounded cursor-pointer group ${active ? 'bg-[#393c43] text-white' : 'text-[#8e9297] hover:bg-[#34373c] hover:text-[#dcddde]'}`}>
        {type === 'text' ? <Hash className="w-5 h-5 mr-1.5 text-[#72767d]" /> : <Volume2 className="w-5 h-5 mr-1.5 text-[#72767d]" />}
        <span className="font-medium truncate">{name}</span>
        {type === 'voice' && (
            <div className="ml-auto flex gap-2 opacity-0 group-hover:opacity-100">
                 {/* Icons could go here */}
            </div>
        )}
    </div>
);

const Message = ({ msg, isFirst }) => {
    const isSus = msg.author === "SuspiciousPerson";
    const avatarColor = isSus ? "bg-red-500" : "bg-green-500";

    return (
        <div className={`flex px-4 py-1 hover:bg-[#32353b] group ${isFirst ? 'mt-[17px]' : 'mt-0.5'}`}>
            {isFirst ? (
                <>
                    <div className={`w-10 h-10 rounded-full ${avatarColor} flex-shrink-0 cursor-pointer flex items-center justify-center text-white font-bold mt-0.5 shadow-sm overflow-hidden`}>
                        {isSus ? 'SP' : 'TU'}
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                        <div className="flex items-center">
                            <span className={`font-medium mr-2 hover:underline cursor-pointer ${isSus ? 'text-red-400' : 'text-white'}`}>
                                {msg.author}
                            </span>
                            <span className="text-[0.75rem] text-[#72767d]">
                                Today at {msg.time}
                            </span>
                        </div>
                        <p className={`text-[#dcddde] whitespace-pre-wrap leading-[1.375rem]`}>
                            {msg.text}
                        </p>
                    </div>
                </>
            ) : (
                <>
                    <div className="w-10 mr-4 flex-shrink-0 text-[10px] text-[#72767d] opacity-0 group-hover:opacity-100 text-right select-none">
                        {msg.time}
                    </div>
                    <div className="flex-1 min-w-0">
                         <p className={`text-[#dcddde] whitespace-pre-wrap leading-[1.375rem]`}>
                            {msg.text}
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default function DiscordClone() {
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [statusMsg, setStatusMsg] = useState('');

    const handleInference = async () => {
        if (!apiKey) {
            setStatus('error');
            setStatusMsg('API Key Required');
            return;
        }

        setStatus('loading');
        try {
            const response = await fetch('http://localhost:5000/api/run_inference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ messages: CONVERSATION_DATA })
            });

            if (!response.ok) throw new Error('Request failed');
            
            const data = await response.json();
            console.log("Inference Result:", data);
            
            setStatus('success');
            setStatusMsg('Sent to Dashboard!');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err) {
            setStatus('error');
            setStatusMsg('Connection Failed');
        }
    };

    return (
        <div className="flex h-screen w-screen bg-[#36393f] font-sans overflow-hidden select-none">
            
            {/* 1. Server Sidebar (Left) */}
            <nav className="w-[72px] bg-[#202225] pt-3 flex flex-col items-center overflow-y-auto scrollbar-hide z-50">
                <ServerIcon initial="AP" image="" active={false} />
                <div className="w-8 h-[2px] bg-[#36393f] rounded-lg mb-2" />
                <ServerIcon initial="G" active={true} />
                <ServerIcon initial="RL" active={false} />
                <ServerIcon initial="MC" active={false} />
                <div className="mt-auto pb-4 flex flex-col gap-2">
                    <div className="w-12 h-12 rounded-[24px] bg-[#36393f] hover:bg-[#3ba55c] text-[#3ba55c] hover:text-white transition-all flex items-center justify-center cursor-pointer group">
                        <Plus className="w-6 h-6 group-hover:text-white transition-colors" />
                    </div>
                </div>
            </nav>

            {/* 2. Channel Sidebar (Middle-Left) */}
            <div className="w-60 bg-[#2f3136] flex flex-col min-w-[240px]">
                {/* Header */}
                <header className="h-12 px-4 flex items-center shadow-sm hover:bg-[#34373c] cursor-pointer transition-colors shadow-stone-900/20">
                    <h1 className="font-bold text-white truncate flex-1">Gaming Lounge</h1>
                    <XCircle className="w-4 h-4 text-white" />
                </header>
                
                {/* Channel List */}
                <div className="flex-1 overflow-y-auto pt-3 px-1 custom-scrollbar">
                    <div className="flex items-center justify-between px-2 pb-1 text-[#8e9297] hover:text-[#dcddde] cursor-pointer uppercase text-xs font-bold tracking-wide">
                        <span>Text Channels</span>
                        <Plus className="w-4 h-4" />
                    </div>
                    <ChannelItem name="welcome" />
                    <ChannelItem name="general" active={true} />
                    <ChannelItem name="memes" />
                    <ChannelItem name="lfg-ranked" />

                    <div className="flex items-center justify-between px-2 pb-1 mt-4 text-[#8e9297] hover:text-[#dcddde] cursor-pointer uppercase text-xs font-bold tracking-wide">
                        <span>Voice Channels</span>
                        <Plus className="w-4 h-4" />
                    </div>
                    <ChannelItem name="Lobby" type="voice" />
                    <ChannelItem name="Duo Q" type="voice" />
                </div>

                {/* User Control Panel */}
                <div className="h-[52px] bg-[#292b2f] flex items-center px-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center font-bold text-xs mr-2 cursor-pointer relative">
                        TU
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#3ba55c] rounded-full border-[2px] border-[#292b2f]"></div>
                    </div>
                    <div className="flex-1 min-w-0 mr-1">
                        <div className="text-white text-sm font-bold truncate">TeenUser</div>
                        <div className="text-[#b9bbbe] text-xs truncate">#8392</div>
                    </div>
                    <div className="flex items-center">
                        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3f4248] text-[#b9bbbe]"><Mic className="w-4 h-4"/></button>
                        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3f4248] text-[#b9bbbe]"><Headphones className="w-4 h-4"/></button>
                        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3f4248] text-[#b9bbbe]"><Settings className="w-4 h-4"/></button>
                    </div>
                </div>
            </div>

            {/* 3. Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#36393f] relative">
                {/* Chat Header */}
                <header className="h-12 px-4 flex items-center shadow-md shadow-stone-900/5 z-10">
                    <Hash className="w-6 h-6 text-[#72767d] mr-2" />
                    <h3 className="font-bold text-white mr-4">general</h3>
                    <div className="h-6 w-[1px] bg-[#42454a] mr-4"></div>
                    <span className="text-[#b9bbbe] text-sm truncate">Is this guy legit?</span>
                    
                    <div className="ml-auto flex items-center gap-4 text-[#b9bbbe]">
                        <Bell className="w-6 h-6 cursor-pointer hover:text-[#dcddde]" />
                        <Pin className="w-6 h-6 cursor-pointer hover:text-[#dcddde]" />
                        <Users className="w-6 h-6 cursor-pointer text-[#dcddde]" />
                        <div className="relative">
                            <input type="text" placeholder="Search" className="bg-[#202225] text-[#dcddde] text-sm rounded px-2 py-1 w-36 transition-all focus:w-60 outline-none" />
                            <Search className="w-4 h-4 absolute right-2 top-1.5 text-[#72767d]" />
                        </div>
                        <Inbox className="w-6 h-6 cursor-pointer hover:text-[#dcddde]" />
                        <HelpCircle className="w-6 h-6 cursor-pointer hover:text-[#dcddde]" />
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-4">
                    {CONVERSATION_DATA.map((msg, idx) => {
                        // Check if previous message was same author to group them visually
                        const prev = CONVERSATION_DATA[idx-1];
                        const isFirst = !prev || prev.author !== msg.author;
                        return <Message key={idx} msg={msg} isFirst={isFirst} />;
                    })}
                    <div className="h-4"></div>
                </div>

                {/* Input Area */}
                <div className="px-4 pb-6">
                    <div className="bg-[#40444b] rounded-lg p-2.5 flex items-center">
                        <div className="bg-[#b9bbbe] rounded-full w-6 h-6 flex items-center justify-center mr-3 cursor-pointer hover:text-white text-[#40444b]">
                            <Plus className="w-4 h-4 font-bold" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Message #general" 
                            className="bg-transparent text-[#dcddde] flex-1 outline-none placeholder-[#72767d]" 
                            disabled 
                        />
                        <div className="flex items-center gap-3 text-[#b9bbbe] mx-2">
                            <Gift className="w-6 h-6 cursor-pointer hover:text-[#dcddde]" />
                            <Sticker className="w-6 h-6 cursor-pointer hover:text-[#dcddde]" />
                            <Smile className="w-6 h-6 cursor-pointer hover:text-[#dcddde]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Member List / Apex Mod Panel (Right) */}
            <div className="w-60 bg-[#2f3136] flex flex-col hidden lg:flex">
                
                {/* APEX MOD TOOL PANEL - Updated Styling */}
                <div className="m-3 p-3 bg-[#202225] rounded-lg border border-[#2f3136] shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-[#96989d]">
                        <ShieldAlert className="w-4 h-4" />
                        <span className="text-[10px] font-bold tracking-widest uppercase">Typically Automated - Example Purposes</span>
                    </div>
                    
                    <input 
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste API Key"
                        className="w-full bg-[#2f3136] text-xs text-white p-2 rounded border border-[#40444b] focus:border-[#5865F2] focus:outline-none mb-2 font-mono"
                    />

                    <button 
                        onClick={handleInference}
                        disabled={status === 'loading'}
                        className={`w-full py-2 rounded text-white text-xs font-bold transition-all ${
                            status === 'success' ? 'bg-green-600' :
                            status === 'loading' ? 'bg-[#4f545c] cursor-wait' : 
                            'bg-[#4f545c] hover:bg-[#5d6269] active:translate-y-0.5'
                        }`}
                    >
                        {status === 'loading' ? 'Sending Log...' : 
                         status === 'success' ? 'Log Sent' : 
                         'Manual Log Submission'}
                    </button>

                    {statusMsg && (
                        <div className={`mt-2 text-[10px] text-center font-bold ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {statusMsg}
                        </div>
                    )}
                </div>

                {/* Standard Member List */}
                <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
                    <div className="mt-4 mb-2 px-2 text-[#96989d] text-xs font-bold uppercase tracking-wide hover:text-[#dcddde]">Online — 2</div>
                    
                    <div className="flex items-center px-2 py-1.5 rounded hover:bg-[#36393f] cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-yellow-500 mr-3 relative flex items-center justify-center text-xs font-bold text-white">
                            TU
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#3ba55c] rounded-full border-[3px] border-[#2f3136]"></div>
                        </div>
                        <div>
                            <div className="text-white font-medium text-sm">TeenUser</div>
                            <div className="text-[#b9bbbe] text-xs">Playing <span className="font-bold">Minecraft</span></div>
                        </div>
                    </div>

                    <div className="mt-6 mb-2 px-2 text-[#96989d] text-xs font-bold uppercase tracking-wide hover:text-[#dcddde]">Offline — 1</div>
                    
                    <div className="flex items-center px-2 py-1.5 rounded hover:bg-[#36393f] cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-red-500 mr-3 relative flex items-center justify-center text-xs font-bold text-white">
                            SP
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#747f8d] rounded-full border-[3px] border-[#2f3136]"></div>
                        </div>
                        <div className="opacity-50">
                            <div className="text-white font-medium text-sm">SuspiciousPerson</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}