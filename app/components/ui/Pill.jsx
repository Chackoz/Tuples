import React from 'react'

const Pill = ({text,onClick}) => {
  return (
    <div className=' h-fit flex items-center gap-1 bg-transparent border-black border-2 text-black  rounded-full cursor-pointer ' onClick={onClick}>
      <div className='px-3 py-2 text-sm font-semibold'>{text} &times;</div>
    </div>
  )
}

export default Pill