import { useEffect, useState } from "react";
import useSocket from "../hooks/useSocket";
const events = require("../event.json");

export default function Blah() {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState([]);
    const socket = useSocket();

    useEffect(() => {
        if (socket) {
            socket.on(events.user.new, message => {
                setMessages(messages => [...messages, message]);
            });
        }
    }, [socket]);

    function submit(e) {
        e.preventDefault();
        socket &&
        socket.emit(events.user.new, {
            id: new Date().getTime(),
            value: message
        });
    }

    return (
        <div>
            <div id="form">
                <form onSubmit={submit}>
                    <input
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                    />
                    <button id="button">submit</button>
                </form>
            </div>

            <div id="tchat">
                <div id="channels">
                    CHANNELS
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
        </div>
    );
}

const form = document.getElementById('form');
const tchat = document.getElementById('tchat');
const button = document.getElementById('button');


