#!/bin/bash

# HLS音频转换脚本 - 统一10秒切片标准
# 用法: ./convert_to_hls.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
AUDIO_DIR="audio"
HLS_DIR="audio.hls"
SEGMENT_DURATION=10  # 每个切片10秒
TARGET_QUALITY="128k" # 音频质量

# 检查ffmpeg是否安装
check_ffmpeg() {
    if ! command -v ffmpeg &> /dev/null; then
        echo -e "${RED}错误: 未找到ffmpeg，请先安装ffmpeg${NC}"
        echo "安装命令: brew install ffmpeg"
        exit 1
    fi
}

# 转换单个音频文件
convert_audio() {
    local input_file="$1"
    local output_name="$2"
    
    echo -e "${BLUE}🎵 开始转换: ${input_file} → ${output_name}${NC}"
    
    # 创建输出目录
    mkdir -p "${HLS_DIR}/${output_name}"
    
    # 获取音频时长
    duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${input_file}")
    segments=$(echo "scale=0; $duration / $SEGMENT_DURATION + 1" | bc)
    
    echo -e "${YELLOW}📊 音频时长: ${duration}秒，预计切片: ${segments}个${NC}"
    
    # 转换为HLS
    ffmpeg -i "${input_file}" \
        -c:a aac \
        -b:a ${TARGET_QUALITY} \
        -ac 2 \
        -ar 44100 \
        -f hls \
        -hls_time ${SEGMENT_DURATION} \
        -hls_list_size 0 \
        -hls_segment_filename "${HLS_DIR}/${output_name}/segment_%03d.ts" \
        "${HLS_DIR}/${output_name}/playlist.m3u8" \
        -y
    
    # 统计实际生成的切片数
    actual_segments=$(ls "${HLS_DIR}/${output_name}"/segment_*.ts 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ ${output_name} 转换完成! 实际切片: ${actual_segments}个${NC}"
}

# 主函数
main() {
    echo -e "${GREEN}🚀 开始批量转换音频文件为HLS格式${NC}"
    echo -e "${YELLOW}📋 配置: 切片时长=${SEGMENT_DURATION}秒, 音质=${TARGET_QUALITY}${NC}"
    echo ""
    
    # 检查依赖
    check_ffmpeg
    
    # 检查输入目录
    if [ ! -d "$AUDIO_DIR" ]; then
        echo -e "${RED}错误: 音频目录 ${AUDIO_DIR} 不存在${NC}"
        exit 1
    fi
    
    # 创建输出目录
    mkdir -p "$HLS_DIR"
    
    # 转换所有音频文件
    for audio_file in "${AUDIO_DIR}"/*.mp3; do
        if [ -f "$audio_file" ]; then
            filename=$(basename "$audio_file" .mp3)
            convert_audio "$audio_file" "$filename"
            echo ""
        fi
    done
    
    # 生成index.json配置文件
    echo -e "${BLUE}📝 生成配置文件...${NC}"
    cat > "${HLS_DIR}/index.json" << EOF
{
$(
    first=true
    for dir in "${HLS_DIR}"/*/; do
        if [ -d "$dir" ]; then
            dirname=$(basename "$dir")
            if [ "$first" = true ]; then
                first=false
            else
                echo ","
            fi
            echo -n "  \"$dirname\": \"audio.hls/$dirname/playlist.m3u8\""
        fi
    done
)
}
EOF
    
    echo -e "${GREEN}🎉 所有文件转换完成!${NC}"
    echo -e "${BLUE}📊 转换统计:${NC}"
    
    # 显示统计信息
    for dir in "${HLS_DIR}"/*/; do
        if [ -d "$dir" ]; then
            dirname=$(basename "$dir")
            segments=$(ls "$dir"/segment_*.ts 2>/dev/null | wc -l)
            size=$(du -sh "$dir" | cut -f1)
            echo -e "  ${dirname}: ${segments}个切片, 总大小: ${size}"
        fi
    done
}

# 运行主函数
main "$@"