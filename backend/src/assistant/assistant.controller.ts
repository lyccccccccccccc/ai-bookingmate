import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssistantService } from './assistant.service';
import { AskQuestionDto } from './dto/ask-question.dto';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('ask')
  @ApiOperation({ summary: 'Ask the FAQ assistant a customer question' })
  ask(@Body() askQuestionDto: AskQuestionDto) {
    return this.assistantService.answerQuestion(askQuestionDto.question);
  }
}
