import { useEffect, useState } from "react";
import useSocket from "../hooks/useSocket";
const events = require("../event.json");

export default function Blah() {
    const [messages, setMessages] = useState([]);
    const [chat, setChat] = useState([]);
    const [nickname, setNickname] = useState('');
    const [showForm, setShowForm] = useState(true);
    const socket = useSocket();

    useEffect(() => {
        if (socket) {
            socket.on(events.user.new, message => {
                /* setMessages(messages => [...messages, nickname]); */
            });
            socket.on(events.message.new, message => {
                setMessages(messages => [...messages, { nickname: message.nickname, chat: message.chat }])
                console.log(messages)
            })

        }
    }, [socket]);

    function submit(e) {
        e.preventDefault();
        socket && socket.emit(events.user.new, {
            id: new Date().getTime(),
            value: nickname
        });
        setShowForm(false);
    }

    function submitchat(e) {
        e.preventDefault();
        socket && socket.emit(events.message.new, {
            chat
        })
        console.log(chat);
    }
    // console.log(messages);
    /* console.log(nickname); */

    return (
        <div>
            {showForm === true && (
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
            {showForm === false && (
                <div id="tchat">
                    <div id="channels">
                        Channels
                    </div>

                    <div id="message">
                        {messages.map(message => (
                            <p key={message.id}>{message.nickname}: {message.chat}</p>
                        ))}
                        <div id="form-message">
                            <form onSubmit={submitchat}>
                                <input
                                    value={chat}
                                    onChange={e => setChat(e.target.value)}
                                />
                                <button id="button">submit</button>
                            </form>
                        </div>
                    </div>

                    <div id="user">
                        Membres
                        {messages.map(msg => (
                        <p key={msg.id}>{msg.value}</p>
                    ))}
                        <hr />
                    </div>
                </div>
            )}
        </div>
    );
}
