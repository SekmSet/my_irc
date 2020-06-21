import { useEffect, useState, useRef } from "react";
import uniqid from 'uniqid';
import useSocket from "../hooks/useSocket";
const events = require("../event.json");

const defaultChannelName = 'default';
let selectedChannel = defaultChannelName;

export default function Index() {
    const [messages, setMessages] = useState([]);
    const [chat, setChat] = useState('');
    const [users, setUsers] = useState([]);
    const [channels, setChannels] = useState([]);
    const [nickname, setNickname] = useState('');
    const [channel, setChannel] = useState('');
    const [showForm, setShowForm] = useState(true);
    const socket = useSocket();

    const elementRef = useRef();

    useEffect(() => {
        if (socket) {
            // USER
            socket.on(events.user.new, message => {
                // si message = array alors définir la liste d'user
                if (message.users && message.channels) {
                    setUsers(message.users);
                    setChannels(message.channels);
                } else {
                    // si message = object ajouter l'utilisateur
                    setUsers(userNew => [...userNew, message]);
                    setMessages(ms => [...ms, { nickname: message.nickname, chat: "is now connected", id: uniqid() }]);
                }
            });

            socket.on(events.user.disconnect, message => {
                // setUsers(function(us) {
                //     return us.filter(usr => usr.id !== message.id );
                // });
                setUsers(us => us.filter(usr => usr.id !== message.id));
                setMessages(ms => [...ms, { nickname: message.nickname, chat: "is disconnected", id: uniqid() }])
            });

            socket.on(events.user.nickname, userNickname => {
                if (userNickname.me) {
                    setNickname(userNickname.user.nickname);
                }

                setUsers(us => us.map((u) => {
                    if (u.nickname !== userNickname.oldNickname) {
                        u.nickname = userNickname.user.nickname;
                    }
                    return u;
                }));

                setMessages(ms => [...ms, { nickname: userNickname.oldNickname, chat: ` renamed to ${userNickname.user.nickname}`, id: uniqid() }]);
            })

            // CHANNEL
            socket.on(events.channel.new, message => {
                setChannels(channelNew => [...channelNew, message]);
                setMessages(ms => [...ms, { nickname: message.user.nickname, chat: ` create a new channel ${message.name}`, id: uniqid() }]);
            });

            // MESSAGE
            socket.on(events.message.new, message => {
                //setMessages(ms => [...ms, message])
                if (selectedChannel !== message.room) {
                    return;
                }
                setMessages(ms => [...ms, { nickname: message.nickname, chat: message.chat, id: message.id, isPrivate: message.isPrivate }])
            });

            // CHANNEL JOIN
            socket.on(events.channel.join, message => {
                if (selectedChannel !== message.name) {
                    setMessages([]);
                }
                selectedChannel = message.name;
                setMessages(ms => [...ms, { nickname: message.user.nickname, chat: `joined this channel ${message.name}`, id: uniqid() }]);
            });
            // CHANNEL DELETED
            socket.on(events.channel.delete, message => {
                if (selectedChannel === message.channelDelete) {
                    selectedChannel = defaultChannelName;
                    setMessages([]);
                }
                setChannels(cs => cs.filter(c => c.id !== message.id));
                setMessages(ms => [...ms, { nickname: message.user.nickname, chat: `deleted channel ${message.channelDelete}`, id: uniqid() }]);

            });
            // CHANNEL RENAMED
            socket.on(events.channel.rename, messages => {
                setChannels(messages.channels);
                if (messages.oldChanName === selectedChannel) {
                    selectedChannel = messages.newChanName
                    setMessages(ms => [...ms, { nickname: messages.nickname, chat: `
                    the channel has been renamed in ${messages.newChanName}`, id: uniqid() }]);

                    socket.emit(events.channel.rename, messages.newChanName);
                }
            });
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
        }, selectedChannel)
        setChat('');
    }

    function newChannel(e) {
        e.preventDefault();
        if (channel !== '') {
            socket && socket.emit(events.channel.new, {
                id: new Date().getTime(),
                value: channel
            });
            setChannel('');
        } else {
            console.log('Name channel is undefined');
        }
    }

    function joinChannel(channelName) {
        socket && socket.emit(events.channel.join, channelName);
        if (selectedChannel !== channelName) {
            setMessages([]);
        }
        selectedChannel = channelName;
    }

    function deleteChannel(chan) {
        socket && socket.emit(events.channel.delete, chan);
    }

    useEffect(() => {
        if (elementRef.current) {
            elementRef.current.scrollTop = elementRef.current.scrollHeight
        }
    }, [messages])


    return (
        <div className="background-welcome">
            {showForm === true && (
                <div>
                    <div className="flex-container-acceuil">
                        <label>Choose your new pseudo </label>
                    </div>
                    <form onSubmit={submit}>
                        <input
                            className="field"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                        />
                        <button className="button">submit</button>
                    </form>
                </div>
            )}
            {showForm === false && (
                <div className="flex-container">
                    <div id="channels">
                        Channels
                        
                        <form onSubmit={newChannel}>
                            <input
                                placeholder="Create new channel"
                                className="field-chan"
                                value={channel}
                                onChange={e => setChannel(e.target.value)}
                            />
                            <button className="button">submit</button>
                        </form>

                        <ul>
                            
                            {channels.map(chan => (
                                <li key={chan.id}>
                                    <button className={`button ${selectedChannel === chan.name ? 'selected' : ''}`} onClick={() => joinChannel(chan.name)}>{chan.name}</button>
                                    <button className="button" onClick={() => deleteChannel(chan)} >🗑️</button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="container">
                        <div className="msg-header">
                            <div className="active">
                                <h4>{nickname}</h4>
                            </div>
                            <div className="allmsg" ref={elementRef}>
                                {messages.map(message => (
                                    <p key={message.id} className={message.isPrivate ? 'private' : ''}>{message.nickname}: {message.chat}</p>
                                ))}
                            </div>
                        </div>
                        <div className="chat-page">
                            <div className="msg-inbox">
                                <div className="msg-page"> 
                                    <form className="form-message" onSubmit={submitchat}>
                                        <input
                                            placeholder="Send message"
                                            className="field-chan"
                                            value={chat}
                                            onChange={e => setChat(e.target.value)}
                                        />
                                        <button className="button">submit</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="user">
                        Membres connected now

                        {users.map(usr => (
                            <p key={usr.id}>{usr.nickname}</p>
                        ))}

                    </div>
                </div>
            )};

            <style jsx> {`
            body {
                font-size: 18px;
                font-weight: 400;
                line-height: 1.8;
                color: #333;
                font-family: sans-serif;
            }
            .allmsg {
                height: 80vh;
                overflow-y: scroll;
            }
            .chat-page{
                padding 0 0 50px 0;
            }
            .msg-inbox{
                border: 1px solid #ccc;
                overflow: hidden;
                padding-bottom: 30px;
            }
            .active{
                width: 120px;
                float: left;
                margin-top: 10px; 
                position: absolute;
            }
            .active h4{
                font-size: 20px;
                margin-left: 10px;
                color: #fff;
            }
            .active h6{
                font-size: 10px;
                margin-left: 10px;
                line-height: 2px;
                color: #fff;
            }
            .container{
                max-width: 500 !important;
                margin: auto;
                margin-top: 4%;
                letter-spacing: 0.5px;
            }
            .msg-header {
                border: 1px solid #ccc;
                width: 100%;
                height: 100%;
                border-bottom: none;
                display: inline-block;
                background-color: grey;
                max-height: 90%;
                
                
            }
            .button {
                background-color: #393e46; 
                border: none;
                color: white;
                padding: 15px 32px;
                text-align: center;
                text-decoration: none;
                display: inline-block;
                font-size: 16px;
                position: sticky;
                width: 19%;
            }
            .button:hover{
                background-color: rgba(200, 204, 200);
            }
            .field {
                margin-top: 1%;
                margin-left: 42%;
                width: 15%;
                height: 56px;
                border-radius: 4px;
                position: relative;
                background-color: #eeeeee;
                transition: 0.3s all;
            }
            .field:hover {
                background-color: rgba(255, 255, 255, 0.45);
                box-shadow: 0px 4px 20px 0px rgba(0, 0, 0, 0.05);
            }
            .flex-container-acceuil{
                padding-top: 13%;
                color: #eeeeee;
                display: flex;
                font-size: 120px;
                justify-content: space-around;
            }
            
            .flex-container {
                color: #eeeeee;
                display: flex;
                font-size: 100%;
                justify-content: space-around;
            }
            .flex-container > div {
                    width: 100%;
                    margin: 10px 0 0 0;
                    text-align: center;
                }

            .field-chan{
                margin-top: 1%;
                margin-left: 0%;
                width: 19%;
                height: 52px;
                border-radius: 4px;
                position: relative;
                background-color: black;
                -webkit-transition: 0.3s all;
                transition: 0.3s all;
            }
            .private {
                background-color: yellow
            }
            .selected {
                background-color: #718096
            }
            `}
            </style>
        </div>
    );
    /* border-left : solid 1px grey; */
}

