import React from 'react'

const Pill = ({text,onClick}) => {
  return (
    <span className='user-pill' onClick={onClick}>
    
      <span>{text} &times;</span>
    </span>
  )
}

export default Pill