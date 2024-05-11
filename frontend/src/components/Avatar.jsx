import React from 'react'

const Avatar = ({online, username, userId}) => {
  const colors=['bg-red-200','bg-green-200','bg-purple-200', 'bg-blue-200','bg-yellow-200']
  const userIdBase10=parseInt(userId,16);
  const color=colors[userIdBase10%colors.length];
  return (
    <div className={'w-10 h-10 relative rounded-full flex items-center '+color}>
      <div className='text-center w-full opacity-70'>{username[0]}</div>
      {online && (
        <div className='absolute w-3 h-3 bg-green-500 bottom-0 right-0 rounded-full border border-white'></div>
      )}
    </div>
  )
}

export default Avatar
