import React, { useContext, useEffect, useRef, useState } from 'react'
import Avatar from './Avatar';
import Logo from './Logo';
import { uniqBy } from 'lodash'
import axios from 'axios'
import { UserContext } from '../UserContext';
import moment from "moment-timezone";
import { debounce } from 'lodash';

const Chat = ({ myUserId }) => {
    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [offlinePeople, setofflinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [newMessageText, setNewMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const [messagesWithoutDuplicates, setMessagesWithoutDuplicates] = useState([]);
    const [newMessageReceived, setNewMessageReceived] = useState(false);
    // const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);

    let typingTimeout;

    const { username, setUsername, setUserId } = useContext(UserContext)

    const selectedUserIdRef = useRef(null);

    function selectUser(userId) {
        selectedUserIdRef.current = userId;
        setSelectedUserId(userId);
    }

    function logout() {
        if (ws) {
            ws.onclose = () => {
                setWs(null);
            };
            ws.close();
        }
        axios.post('/logout').then(() => {
            // localStorage.removeItem('token');
            setUserId(null)
            setUsername(null)
        })
    }

    const handleTyping = () => {
        // Send typing event if not already typing
        console.log("Typing");

        if (ws && selectedUserId) {
            ws.send(JSON.stringify({
                sender: myUserId,
                recipient: selectedUserId,
                typing: true
            }));
            // setIsTyping(true);
        }

        // Clear previous timeout
        clearTimeout(typingTimeout);

        // Set a timeout to send a "not typing" event
        typingTimeout = setTimeout(() => {
            if (ws && selectedUserId) {
                ws.send(JSON.stringify({
                    sender: myUserId,
                    recipient: selectedUserId,
                    typing: false
                }));
                // setIsTyping(false);
            }
        }, 2500); // 4 seconds after user stops typing
    };

    const messageContainerRef = useRef(null)

    const scrollToBottom = () => {
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
        setNewMessageReceived(false);
    };

    function showOnlinePeople(peoplearray) {
        const onlinePeople = {};
        peoplearray.forEach(({ userId, username }) => {
            if (userId && userId !== myUserId)
                onlinePeople[userId] = username;
        })
        setOnlinePeople(onlinePeople);
    }

    function handleIncomingMessage(e) {
        const messageData = JSON.parse(e.data);

        if ('online' in messageData) {
            showOnlinePeople(messageData.online);
        }
        else if ('typing' in messageData) {
            console.log("Message received: ", messageData);
            if (messageData.typing) {
                setTypingUsers(prev => ([...prev, messageData.sender]));
            } else {
                setTypingUsers(prev => prev.filter(user => user !== messageData.sender));
            }
        }
        else if ('text' in messageData || 'file' in messageData) {
            // console.log("Selected user id: ",selectedUserId);
            // console.log("Message sender: ",messageData.sender);
            if (messageData.sender == myUserId) {
                setMessages(prev => ([...prev, { ...messageData }]));
                setNewMessageReceived(false);
                scrollToBottom();
            }
            else if (messageData.sender == selectedUserIdRef.current) {
                setMessages(prev => ([...prev, { ...messageData }]));
                const isScrolledUp = messageContainerRef.current.scrollTop < (messageContainerRef.current.scrollHeight - messageContainerRef.current.clientHeight);
                if (isScrolledUp) {
                    setNewMessageReceived(true);
                }
            }
        }
    }

    async function sendMessage(e, file = null) {
        if (e) {
            e.preventDefault();
        }
        // setIsTyping(false);
        ws.send(JSON.stringify({
            sender: myUserId,
            recipient: selectedUserId,
            typing: false
        }));

        if (!file && !newMessageText.trim()) {
            setNewMessageText('');
            return;
        }

        ws.send(JSON.stringify({
            sender: myUserId,
            recipient: selectedUserId,
            text: newMessageText,
            file
        }));


        setNewMessageText('');

    }

    function sendFile(e) {
        const file = e.target.files[0];

        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const fileData = {
                name: file.name,
                data: reader.result
            };
            sendMessage(null, fileData);
        };
        e.target.value = null;
    }

    function connectToWs() {
        const ws = new WebSocket('wss://chitchat-ei78.onrender.com');
        setWs(ws);
        ws.addEventListener('message', handleIncomingMessage);

        ws.addEventListener('close', () => {      //to handle disconnections
            setTimeout(() => {
                connectToWs();
            }, 1500)
        });
    }

    useEffect(() => {
        connectToWs();
        return () => {
            clearTimeout(typingTimeout);
        };
    }, []);

    useEffect(() => {    // display messages
        setMessagesWithoutDuplicates(uniqBy(messages, '_id'));
    }, [messages])

    useEffect(() => {    //scroll to bottom
        if (!newMessageReceived) {
            scrollToBottom();
        }
    }, [messagesWithoutDuplicates])

    useEffect(() => {    //to retrieve all chats
        setMessages([])
        if (selectedUserId) {
            axios.get('/messages/' + selectedUserId).then(res => {
                setMessages(res.data);
            });
        }
    }, [selectedUserId])

    useEffect(() => {   // to display offline people
        const offlinePeople = {}
        axios.get('/people').then(res => {
            const people = res.data;
            Object.entries(people).forEach(([userId, username]) => {
                if (userId !== myUserId && !(userId in onlinePeople)) {
                    offlinePeople[userId] = username;
                }
            })
            setofflinePeople(offlinePeople);
        });
    }, [onlinePeople])

    return (
        <div className='flex h-screen'>
            <div className='bg-white w-1/3 flex flex-col'>
                <div className='flex-grow'>
                    <Logo />
                    {Object.keys(onlinePeople).map(userId => (
                        <div key={userId} onClick={() => { console.log("Clicked user ID:", userId); selectUser(userId) }} className={'border-b border-gray-100 py-2 pl-4 flex items-center gap-2 cursor-pointer ' + (userId == selectedUserId ? 'bg-blue-200' : '')}>
                            {userId == selectedUserId && (
                                <div className='w-1 bg-blue-500 h-12 rounded-r-md'></div>
                            )}
                            <div className='flex gap-2 py-2 pl-4 items-center'>
                                <Avatar online={true} username={onlinePeople[userId]} userId={userId} />
                                <span>{onlinePeople[userId]}</span>
                            </div>
                        </div>
                    ))}
                    {Object.keys(offlinePeople).map(userId => (
                        <div key={userId} onClick={() => { console.log("Clicked user ID:", userId); selectUser(userId) }} className={'border-b border-gray-100 py-2 pl-4 flex items-center gap-2 cursor-pointer ' + (userId == selectedUserId ? 'bg-blue-200' : '')}>
                            {userId == selectedUserId && (
                                <div className='w-1 bg-blue-500 h-12 rounded-r-md'></div>
                            )}
                            <div className='flex gap-2 py-2 pl-4 items-center'>
                                <Avatar online={false} username={offlinePeople[userId]} userId={userId} />
                                <span>{offlinePeople[userId]}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className='p-2 text-center flex items-center justify-center'>
                    <span className='mr-2 text-sm text-gray-800 flex items-center'>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        {username}
                    </span>
                    <button onClick={logout} className='text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm'>Logout</button>
                </div>
            </div>

            <div className='bg-blue-100 w-2/3 p-2 flex flex-col'>
                {!!selectedUserId && (
                    <div className='fixed top-0 w-full z-10 bg-white border-b border-gray-200 py-2 pl-4 flex items-center'>
                        <div className='text-lg items-center'>
                            <span>{onlinePeople[selectedUserId] || offlinePeople[selectedUserId]}</span>
                        </div>
                        <div className='text-sm ml-4 items-center'>
                            {onlinePeople[selectedUserId] ?
                                (typingUsers.includes(selectedUserId) ?
                                    <span>Typing...</span> : <span className="text-green-500">Online</span>) : <span className="text-red-500">Offline</span>
                            }
                        </div>
                    </div>
                )}
                <div className='flex-grow'>
                    {!selectedUserId && (
                        <div className='flex h-full flex-grow items-center justify-center'>
                            <div className='text-gray-500'>
                                No chats selected
                            </div>
                        </div>
                    )}

                    {!!selectedUserId && (
                        <div className='relative h-full'>
                            <div ref={messageContainerRef} className='overflow-y-scroll scroll-smooth scrollbar-hide absolute top-10 left-0 right-0 bottom-2'>
                                {messagesWithoutDuplicates.map((message, index) => {
                                    const messageDate = moment(message.date);
                                    const currentDate = moment().startOf('day');
                                    const yesterdayDate = moment().subtract(1, 'days').startOf('day');

                                    // Check if the message date is today or yesterday
                                    let displayDate;
                                    if (messageDate.isSame(currentDate, 'day')) {
                                        displayDate = 'Today';
                                    } else if (messageDate.isSame(yesterdayDate, 'day')) {
                                        displayDate = 'Yesterday';
                                    } else {
                                        displayDate = messageDate.format('YYYY-MM-DD');
                                    }

                                    // Check if index is 0 or date is different from the previous message
                                    const isFirstMessage = index === 0;
                                    const isDifferentDate = !isFirstMessage && displayDate !== moment(messagesWithoutDuplicates[index - 1].date).format('YYYY-MM-DD');

                                    return (
                                        <React.Fragment key={message._id}>
                                            {(isFirstMessage || isDifferentDate) && (
                                                <div className="text-center mb-2">
                                                    {displayDate}
                                                </div>
                                            )}
                                            <div className={message.sender === myUserId ? 'flex justify-end' : 'flex justify-start'}>
                                                <div className={"max-w-lg inline-block p-1 mx-3 my-2 rounded-md text-md break-all " + (message.sender === myUserId ? 'bg-blue-500 text-white' : 'bg-white text-black')}>
                                                    {message.text}
                                                    {message.file && (
                                                        <div>
                                                            <a target="_blank" className='underline' href={axios.defaults.baseURL + '/uploads/' + message.file}>
                                                                {message.file}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>

                {!!selectedUserId && (
                    // <div className='w-4/5 mx-auto flex gap-2 justify-between items-center'>
                    <div className='w-full flex'>
                        <form className='w-11/12 justify-center items-center flex gap-2' onSubmit={sendMessage}>
                            <input value={newMessageText} onChange={e => { setNewMessageText(e.target.value); handleTyping(); }} type="text" placeholder='Message' className='bg-white border p-2 w-4/5 rounded-lg' />
                            <label className='bg-gray-200 p-2 text-gray-500 rounded-sm border border-gray-300 cursor-pointer'>
                                <input type="file" className='hidden' onChange={sendFile} />
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                </svg>
                            </label>
                            <button className='bg-blue-600 p-2 text-white rounded-lg' type='submit'>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                            </button>
                        </form>
                        <div className="w-1/12 flex justify-end items-center" onClick={() => scrollToBottom()}>
                            <button className={'rounded-full bg-white p-2 ' + (newMessageReceived ? "border border-blue-600" : "")}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}

export default Chat
