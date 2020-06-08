import { useEffect, useState } from "react";
import useSocket from "../hooks/useSocket";
const events = require("../event.json");

export default function Blah() {
    const [messages, setMessages] = useState([]);
    const [nickname, setNickname] = useState('');
    const [showForm, setShowForm] = useState(true);
    const socket = useSocket();

    useEffect(() => {
        if (socket) {
            socket.on(events.user.new, message => {
                setMessages(messages => [...messages, nickname]);
            });
        }
    }, [socket]);

    function submit(e) {
        e.preventDefault();
        socket &&
        socket.emit(events.user.new, {
            id: new Date().getTime(),
            value: nickname
        });
        setShowForm(false);
    }
    // console.log(messages);
    console.log(nickname);

    return (
        <div>
            { showForm === true && (
                <div id="form">
                    <form onSubmit={submit}>
                        <input
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                        />
                        <button id="button">submit</button>
                    </form>
                </div>
            )}
            { showForm === false && (
                <div id="tchat">
                    <div id="channels">
                        Channels
                    </div>

                    <div id="message">
                        {messages.map(msg => (
                            <p key={msg.id}>{msg.value} vient de rejoindre se channel !</p>
                        ))}
                    </div>

                    <div id="user">
                        Membres
                        {messages.map(msg => (
                            <p key={msg.id}>{msg.value}</p>
                        ))}
                        <hr/>
                    </div>
                </div>
            )}
        </div>
    );
}
