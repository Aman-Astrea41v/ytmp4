import React from 'react'
import { useQuery } from "@tanstack/react-query";
import { parse } from 'tough-cookie';

const getData = async () => {
    const data = await fetch(`${process.env.REACT_APP_TEST_API}`);
    const parsedData = await data.json();
    console.log(parsedData);
    return parsedData;
}

const CompTest = () => {

    const { data, error, isLoading } = useQuery({
        queryKey:['users'],
        queryFn: getData,
        enabled:false
    });

  return (
    <div>
        {isLoading && <p>Loading ......</p>}

        { !isLoading && 
        <>
            {
                data.users.map(user => {
                    return <li key={user.id}>{user.firstName} {user.lastName}</li>
                })
            }
        </> }
    </div>
  )
}

export default CompTest
