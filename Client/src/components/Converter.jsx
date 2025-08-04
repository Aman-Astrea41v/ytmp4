import React, { useEffect, useState } from 'react'
import "../styles/Converter.css";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TailSpin, FallingLines } from "react-loader-spinner";
import { io } from "socket.io-client";
import { Success, Error } from "./toast";
import StepsToDownload from "./StepsToDownload";

const socket = io(process.env.REACT_APP_BACKEND_URL);

const Converter = () => {
    // States
    const [url, setURL] = useState('');
    const [itag, setItag] = useState(null);
    const [thumbnailUrl,setThumbnailURL] = useState('');
    const [downloadStart,setDownloadStart] = useState(false);
    const [progress,setProgress] = useState({text:'',value:0});

    // Initialization
    const queryClient = useQueryClient();

    const getYoutubeVideoThumbnail = (url) => {
        try{
            const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^\s&?/]+)/;
            const match = url.match(regex);
            if (match && match[1]) {
                const videoId = match[1];
                const thumbnailLink = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                setThumbnailURL(thumbnailLink);
            } else {
                Error("Invalid YouTube URL");
                return null;
            }
        }
        catch(err){
            // console.error(err);
            Error("Some Error Occured.Try Refreshing and Download Again.");
        }
    }

    const getVideoInfo = async () => {
        if (url == '') {
            Error('Empty URL.Please paste Youtube Link.')
            return null;
        }
        else {
            try{
                const data = await fetch(`${process.env.REACT_APP_BACKEND_URL}/getVideoInfo`, {
                    method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    url
                })
            });
                
                const parsed = await data.json();
                if(data.ok){
                    getYoutubeVideoThumbnail(url);
                    return parsed;
                }
                else{
                    // console.log(parsed);
                    Error(parsed?.message || "Some error occured");
                    return null;
                }
            }
            catch(err){
                // console.error("Info 59: "+err);
                Error("Some Error Occured")
            }
        }
    }

    const startDownloadVideo = async (itag) => {
        if (!itag) return null

        try{
            const data = await fetch(`${process.env.REACT_APP_BACKEND_URL}/getDownloaded`, {
                method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url,
                itag
            })
        });
        const parsed = await data.json();
            if(data.ok){
                return parsed;
            }
            else{
                Error(parsed?.message || 'Some Error occured')
                return  null
            }
        }   
        catch(err){
            // console.error(err);
            Error('Some Error occured');
        }
    }

    const startGettingInfo = (e) => {
        e.preventDefault();
        setThumbnailURL('');
        setItag(null);
        setDownloadStart(false);
        infoRefetch();
    }

    const { data: infoData, refetch: infoRefetch, isError: isInfoError ,isLoading: infoLoading } = useQuery({
        queryKey: ['info'],
        queryFn: getVideoInfo,
        enabled: false
    })

    const { data: videoData, isLoading: videoLoading, isSuccess: videoSuccess } = useQuery({
        queryKey: ['videos', itag],
        queryFn: () => startDownloadVideo(itag),
        enabled: !!itag,
    })  



    // UseEffects

    useEffect(() => {
        if (url && downloadStart) {
            queryClient.removeQueries(['info']);
            queryClient.removeQueries(['videos']);
            setDownloadStart(false);
            setURL('');
            setThumbnailURL('');
            setProgress({text:'',percent:0})
            setItag(null);
        }
    }, [url, downloadStart]);

    useEffect(() => {
        if (downloadStart) {
            const timeoutId = setTimeout(() => {
            queryClient.removeQueries(['info']);
            setURL('');
            setProgress({text:'',percent:0})
        }, 10000);

            return () => clearTimeout(timeoutId);
        }
    }, [downloadStart]);


    // Socket
    useEffect(() => {
        const handleProgress = (data) => {
            if(data.text == 'Video is ready to download'){
                Success("Video is ready to download.Click Download Video.");
            }
            setProgress({text:data.text,value:data.percent});
        };

        socket.on("progress", handleProgress);

        return () => {
        socket.off("progress", handleProgress);
        };
    }, []);

    return (
        <div className="container">
            <div className="card">
                <h2>▶️ YouTube Video Downloader</h2>
                <div className="input-group">
                    <form onSubmit={startGettingInfo} className='form'>
                        <input type="text" name="url" disabled={infoLoading} onChange={(e) => { setURL(e.target.value) }} placeholder="Paste YouTube URL here..." value={url}/>
                        <button type="submit" disabled={infoLoading}>Get Video</button>
                    </form>
                </div>
                {/* <p className='errorURL'>{infoErr}</p> */}
            </div>

            {
                !infoLoading && !infoData && 
                <StepsToDownload />
            }

            <div className="infoContainer">

                <div className="imgContainer">

                    {

                        infoData &&
                        <>
                            <img className='thumbnail' src={thumbnailUrl} alt={infoData.title} height={300} width={600} />

                            <p className='title'>Title: {infoData.title}</p>
                        </>
                    }
                </div>
                
                {
                    videoLoading && 
                    <div className="progressBar">
                        <progress className='progress-bar' value={progress.value} max={100}>{progress.value}%</progress>
                        <p className='progress-txt'>{progress.text}  
                            <FallingLines
                                color="#4fa94d"
                                width="40"
                                height='20'
                                visible={true}
                                ariaLabel="falling-circles-loading"
                            />
                        </p>

                    </div>
                }

                <div className="btn-container">
                    {
                        videoData &&
                        <a className='download-btn' onClick={() => setDownloadStart(true)} href={`${process.env.REACT_APP_BACKEND_URL}/videos/${videoData.videoLink}.mp4`} download>Download Video</a>
                    }
                </div>

                {/* <p className='errorURL'>{videoErr}</p> */}

                {/* Getting Options Loading */}
                {infoLoading && <p className='infoLoader'>Getting Video .....</p>}

                {/* Info Loading Bar */}
                {
                    <div className='infoLoader'>
                        <TailSpin
                            visible={infoLoading}
                            height="50"
                            width="50"
                            color="#4fa94d"
                            ariaLabel="tail-spin-loading"
                            radius="1"
                            wrapperStyle={{}}
                            wrapperClass=""
                        />
                    </div>
                }
                {isInfoError && infoData?.message}

                {
                    (!isInfoError && infoData) &&
                    <div className="download-options">
                        <h4>Download Options:</h4>
                        {
                            infoData?.data?.map(option => {
                                return (
                                    <div className='download-buttons' key={option.qualityLabel} disabled={videoLoading} onClick={() => { setItag(option.itag) }}>
                                        <span>{option.container}  {option.qualityLabel} ⬇️</span>
                                        <span>{((Number(option.contentLength) / 1048576)+3).toFixed(1)} MB</span>
                                    </div>
                                )
                            })
                        }

                    </div>
                }
            </div>

            {/* <!-- Features Section --> */}

            <section className="features">
                <div className="feature-card">
                    <h3>🎯 Easy to Use</h3>
                    <p>Paste a link and download in seconds. No clutter or ads.</p>
                </div>
                <div className="feature-card">
                    <h3>📺 High Quality</h3>
                    <p>Choose from multiple formats like MP4 1080p, 720p, or MP3.</p>
                </div>
                <div className="feature-card">
                    <h3>⚡ Fast Analysis</h3>
                    <p>Quick video lookup with progress feedback to users.</p>
                </div>
                <div className="feature-card">
                    <h3>🛡️ Secure & Private</h3>
                    <p>Your data stays local. No tracking or account required.</p>
                </div>
            </section>

        </div>

    )
}

export default Converter
